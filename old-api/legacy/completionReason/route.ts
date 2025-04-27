import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; function_call?: any }
  | { role: "function"; name: string; content: string };

async function create_file(file_name: string) {
  const response = await fetch(
    "http://localhost:3000/api/legacy/data/createFile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name }),
    }
  );
  const responseData = await response.json();
  if (!response.ok) {
    console.error(`Failed to create file: ${response.statusText}`);
    return { success: false, error: responseData.message };
  }
  return responseData;
}

async function write_initial_data(file_contents: string, file_name: string) {
  // Change the function signature to match what the model expects
  const response = await fetch(
    "http://localhost:3000/api/v2/reason/writeInitialData",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name, data: file_contents }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to write initial data: ${response.status} ${response.statusText}`);
    console.error(`Error details: ${errorText}`);
    return { 
      success: false, 
      error: `Server error (${response.status}): ${response.statusText}` 
    };
  }
  
  try {
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(`Failed to parse JSON response in write_initial_data: ${error}`);
    return { 
      success: false, 
      error: `Failed to parse server response: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

async function publish_new_version(new_file: string, file_name: string) {
  // Standardize parameter naming to avoid confusion
  const data = new_file;
  
  const response = await fetch(
    "http://localhost:3000/api/v2/reason/publishNewVersion",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name, data }), // Consistent parameter names
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to publish new version: ${response.status} ${response.statusText}`);
    console.error(`Error details: ${errorText}`);
    return { 
      success: false, 
      error: `Server error (${response.status}): ${response.statusText}` 
    };
  }
  
  try {
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(`Failed to parse JSON response in publish_new_version: ${error}`);
    return { 
      success: false, 
      error: `Failed to parse server response: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}

async function read_file(file_name: string) {
  const response = await fetch(
    `http://localhost:3000/api/legacy/data/readFile?file_name=${file_name}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  const responseData = await response.json();
  if (!response.ok) {
    console.error(`Failed to read file: ${response.statusText}`);
    return { success: false, error: responseData.message };
  }
  return responseData;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let searchContent: {
      name: string;
      description: string;
      parameters: {
        type: string;
        required: string[];
        properties: {
          query: { type: string };
        };
      };
    } | null = null;
    const userName = body.userName;
    const { messages: userMessages } = body;
    const functionCallLogs: { name: string; arguments: any }[] = [];

    if (!body.messages) {
      return NextResponse.json(
        {
          success: false,
          message: "Messages are required",
        },
        { status: 400 }
      );
    } else if (!userName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please specify the user's name in userName in body, it is required",
        },
        { status: 400 }
      );
    }

    console.log();
    console.log(`v2 Completion Endpoint Call [Reasoning Model]`);
    console.log();

    // Check if the user message contains reference to an existing file
    // This is a simple heuristic - we look for .md file mentions in the last message
    const potentialFileNames = extractPotentialFilenames(userMessages);
    let existingFileContent = null;
    let existingFileName = null;
    
    // If we found potential file names, try to read them and attach the content
    if (potentialFileNames.length > 0) {
      console.log("Detected potential file references:", potentialFileNames);
      
      // Try each file name until we find one that exists
      for (const fileName of potentialFileNames) {
        try {
          console.log(`Attempting to read file: ${fileName}`);
          const fileResult = await read_file(fileName);
          
          if (fileResult.success) {
            existingFileContent = fileResult.data;
            existingFileName = fileName;
            console.log(`Successfully read file: ${fileName}`);
            break;
          }
        } catch (error) {
          console.log(`Failed to read file ${fileName}:`, error);
        }
      }
    }
    
    let conversation: Message[] = [
      {
        role: "system",
        content:
          `You are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. You have functions do perform your tasks. You will use this prompt to understand how to create BRS documents, write initial data to them, and to edit them. You can create_file to create a document. You will also provide the initial content of the document for write_initial_data follow the below criteria strictly to correctly create a BRS document. BRS Documents are just .md files, they can only use letters a to z, A to Z, numbers and dashes. Special characters, spaces and underscores are strictly prohibited. You must create a file first, but you cannot do anything with the document. You must first call write_initial_data to initialize the document. You will only write the initial data as long as you have the information you need for at least one screen. If you want to update the content of the document, it is a different process, you must first think of an overview of how you must implement the requested changes. You must ask the user ask many questions as you can to make sure you understand what the user wants. Add the file_name of the file that needs to be edited and once you interact with a file, make sure you remember it for future use. If the user tries to generate a BRS in one message, Let the user know that creating a BRS effectively cannot be done in one message and let them know that they can ask you for questions for writing out data for each screen, and you can make it detailed with their input. Your primary role is to simply extract as much input as you can from the user, making suggestions and improvements frequently. You suggest screens, sections, or items to add in a numbered list format and pass the user input into functions. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working to create a BRS. You should make sure you provide the best service possible to the user to accurately get an idea of what they want. You should sound like a human. It needs to be extremely specific, detailed and follow requirements. You will only do what the user has asked you to do, if the user is vague, you must ask questions until you can accurately create the rest of the BRS, you may provide suggestions to the user on potential screens to add.` +
          `Creating a Business Requirements Specification (BRS) document in markdown can be done using a document title at the beginning. Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple paragraph explaining the screen. You may use bold text, italics, bullet points or other visual aids to accompany this paragraph in this second section. It needs to be a brief overview. Use simple language that gets the point across without being unprofessional. The third section is the diagram. If this is a UI based function, then you add a diagram with a json markdown code block containing json {"brsDiagram": {}} The fourth and last section of every screen is the extra data. This is the last section, but it the main part of the screen information. It contains all the details and specifications, you must break down, decompose, and fully explain everything that the screen does, including explaining individual functions, adding tables or bullet points to specify data types, validation, inputs etc. You will also break it down fully for each module, each screen has modules and each models must have a properly explained inputs, processes, and outputs. There will always be some for of a short 1-2  sentence description in 1 or 2 lines too.  This could be adding a table for some sample data, tables to specify form field types, bullet points for extra info, etc. If sample data is there, make sure it is at least 7 rows.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this. You will not use bullet points to display lists with only 1 item, they should never feel empty. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. EXTEMELY IMPORTANT: You should be expected to think beyond what you were asked to do. You must assume and think hard about what the users requirements are, what the user implicitly might want too and add it in. Be detailed about it. For example, if you are asked to "create a one screen library management system only tracking books using crud for storage". Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, etc. each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, you should be extremely specific and assume details you doesn't know. in the module example for example, you should explain how the module processes user input and how it displays output and, plans for the ui, for example in the read books module it suggests a plan for example you could add "
                1. The user would be required to input the name of the book they are querying
                2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
                4. The system should validate the input to ensure the book name exists in the database.
                5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
                6. The retrieved details are displayed in a user-friendly format on the UI.
                7. If the book name is not found, the system should display an appropriate error message to the user.
                8. The UI should provide an option to go back to the main menu or perform another search.
                " Understand this example and think hard about the kind of BRS quality I expect. Know that this is an example and it is different depending on each users requests, but understand what I mean by you should go the extra mile to be specific. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table where you think it will look good. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core. Make sure a BRS never looks empty to anyone.` +
          `Context: The users name is ${body.userName}` +
          `If you want to update the document, you must use publish_new verion, warning: the new document you put will completely overwrite the existing contents of the document` +
          `You receive change requests and the current document content. 
              You must implement only the requested changes while preserving all existing content unless explicitly asked to modify it. 
              Each screen must maintain the format: 
              H2 heading (numbered), 
              optional description, diagram section, 
              and extra data section.  

              Before you update the document at all, you MUST read the document from top to bottom and fully understand what you have to change, always read the contents of the document before updating it to prevent accidently losing data.
              Publishing a new version of the document will completely overwrite the existing contents of the document. So please, please and please, be careful when updating the document.

              Please update the document following these requirements:
              1. Keep the existing document structure
              2. Only make changes specified in the overview
              3. Maintain all existing content unless explicitly asked to change/remove it
              4. Return the complete updated document
              5. Make sure to read the document before updating it to prevent accidental data loss.
              6. If you are unsure about any changes, ask the user for clarification.
              Extra Important things to follow:
              7. Do not prefix any part of the BRS with a heading (Example: DO NOT PUT DESCRIPTION OR TITLE BEFORE THE TEXT)
              8. Diagrams are code blocks containing JSON "{"brsDiagram": {}" Do not modify this blank diagram template.`,
      },
      ...userMessages,
    ];

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: "Misconfigured OpenAI environment variable in backend",
        },
        { status: 500 }
      );
    }

    // Add a mechanism to prevent loops - track function calls
    const functionCallHistory: {name: string, args: {file_name?: string}}[] = [];
    // Increase the maximum allowed consecutive calls to prevent false loop detection
    const maxConsecutiveCalls = 4; // Maximum number of consecutive identical calls allowed

    const streamingResponse = new Response(
      new ReadableStream({
        async start(controller) {
          const sendVerbose = (data: any) => {
            if (data.conversation) {
              data.conversation = data.conversation.filter(
                (msg: any) => msg.role !== "system"
              );
            }
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: "verbose", data })}\n\n`
              )
            );
          };

          while (true) {
            sendVerbose({ message: "Starting OpenAI request", conversation });

            // Filter out function messages before sending to OpenAI
            const apiMessages = conversation.filter(
              (msg) => msg.role !== "function"
            );

            const openAiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: "o4-mini",
                  reasoning_effort: "medium",
                  messages: apiMessages, // Use filtered messages
                  functions: [
                    {
                      name: "create_brs_file",
                      description: "Creates a .md file for the BRS document",
                      parameters: {
                        type: "object",
                        required: ["file_name"],
                        properties: {
                          file_name: { type: "string" },
                        },
                      },
                    },
                    {
                      name: "read_file",
                      description:
                        "Reads the contents of a file. Only use this for your reference and context. Do not display the contents of a file to a user. Read the file whenever the user is asking a question about a file.",
                      parameters: {
                        type: "object",
                        required: ["file_name"],
                        properties: {
                          file_name: { type: "string" },
                        },
                      },
                    },
                    {
                      name: "publish_new_version",
                      description:
                        "Update the BRS document with the user's requested changes. Provide the full, updated version of the document.",
                      parameters: {
                        type: "object",
                        required: ["new_file", "file_name"],
                        properties: {
                          new_file: { type: "string" },
                          file_name: { type: "string" },
                        },
                      },
                    },
                    {
                      name: "write_initial_data",
                      description:
                        "Writes initial data for version one for a file. You must call this to write initial data to a .md BRS file that you created",
                      parameters: {
                        type: "object",
                        required: ["file_contents", "file_name"],
                        properties: {
                          file_contents: { type: "string" },
                          file_name: { type: "string" },
                        },
                      },
                    },
                    ...(searchContent ? [searchContent] : []),
                  ],
                  temperature: 1.0,
                  stream: false,
                }),
              }
            );

            if (!openAiResponse.ok) {
              const errorText = await openAiResponse.text();
              console.error(`OpenAI error: ${errorText}`);
              throw new Error(`OpenAI error: ${errorText}`);
            }

            const openAiResult = await openAiResponse.json();
            const message = openAiResult.choices[0].message;
            conversation.push(message);

            console.log("OpenAI Response:");
            console.log(message);

            if (message.function_call) {
              const { name, arguments: args } = message.function_call;
              const functionArgs = JSON.parse(args);

              // Check for loops in function calls
              if (functionCallHistory.length > 0) {
                const lastCall = functionCallHistory[functionCallHistory.length - 1];
                let consecutiveCallCount = 1;
                
                // Count identical consecutive calls
                for (let i = functionCallHistory.length - 2; i >= 0; i--) {
                  const call = functionCallHistory[i];
                  if (call.name === name && 
                      call.args.file_name === functionArgs.file_name) {
                    consecutiveCallCount++;
                  } else {
                    break;
                  }
                }
                
                // If we detect a loop, send an error message and break the loop
                if (consecutiveCallCount >= maxConsecutiveCalls && 
                    (name === 'create_brs_file' || name === 'write_initial_data' || name === 'publish_new_version')) {
                  console.warn(`Detected function call loop: ${name} called ${consecutiveCallCount} times consecutively`);
                  
                  // Send a special message to break the loop
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "functionResult",
                        data: {
                          success: false,
                          error: `Detected a potential loop with function ${name}. Please try a different approach.`,
                          loopDetected: true
                        },
                      })}\n\n`
                    )
                  );
                  
                  conversation.push({
                    role: "assistant",
                    content: `Function ${name} was called too many times in succession. I've detected a potential loop and stopped it. Please try a different approach or command.`,
                  });
                  
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "message",
                        content: `I've detected a loop in my operations with the file "${functionArgs.file_name}". Let's try a different approach. Could you please give me a new instruction for what you'd like to do with this document?`,
                      })}\n\n`
                    )
                  );
                  
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({ type: "end" })}\n\n`
                    )
                  );
                  controller.close();
                  return;
                }
              }
              
              // Track this function call
              functionCallHistory.push({ name, args: { file_name: functionArgs.file_name } });

              const functionResult = await (async () => {
                console.log();
                console.log("Function Call:");
                console.log("Name: ", name);
                console.log("Parameters: ", functionArgs);
                console.log();

                // Send "function" chunk
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "function",
                      data: name,
                      parameters: functionArgs, // Include the function parameters
                    })}\n\n`
                  )
                );

                if (name === "create_brs_file") {
                  return await create_file(functionArgs.file_name);
                } else if (name === "write_initial_data") {
                  return await write_initial_data(
                    functionArgs.file_contents, 
                    functionArgs.file_name
                  );
                } else if (name === "publish_new_version") {
                  // Fix parameter mismatch - use new_file instead of user_inputs
                  return await publish_new_version(
                    functionArgs.new_file,  // <-- CHANGED FROM user_inputs
                    functionArgs.file_name
                  );
                } else if (name === "read_file") {
                  return await read_file(functionArgs.file_name);
                } else if (name === "search") {
                  try {
                    const response = await fetch(
                      `http://localhost:3000/api/v1/search?query=${functionArgs.query}`,
                      {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                      }
                    );
                    console.log("RESPONSE SEARCH: ", response);
                    const responseData = await response.text();
                    console.log("RESPONSE SEARCH DATA: ", responseData);
                    return responseData
                      ? JSON.parse(responseData)
                      : { success: false, error: "Empty response" };
                  } catch (error) {
                    console.error(`Failed to perform search: ${error}`);
                    return {
                      success: false,
                      error: "Failed to process search results",
                    };
                  }
                } else {
                  console.error(`Function ${name} not found.`);
                  throw new Error(`Function ${name} not found.`);
                }
              })();

              sendVerbose({
                message: "Function called",
                name,
                arguments: functionArgs,
                result: functionResult,
              });

              // Send "functionResult" chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "functionResult",
                    data: functionResult,
                  })}\n\n`
                )
              );

              console.log();
              conversation.push({
                role: "assistant",
                content: `Function ${name} was called with result: ${JSON.stringify(
                  functionResult
                )}`,
              });
            } else {
              // If no function was called, and we've detected a file but never read it explicitly,
              // we should force a read_file call before responding
              if (existingFileName && !functionCallHistory.some(call => 
                  call.name === 'read_file' && call.args.file_name === existingFileName)) {
                
                console.log(`File ${existingFileName} was referenced but never explicitly read. Reading it now.`);
                
                const fileResult = await read_file(existingFileName);
                
                // Only process the read if it succeeded
                if (fileResult.success) {
                  // Track this function call
                  functionCallHistory.push({ name: 'read_file', args: { file_name: existingFileName } });
                  
                  // Add the file contents to the conversation
                  conversation.push({
                    role: "assistant",
                    content: `Let me check the current content of ${existingFileName} before proceeding.`,
                  });
                  
                  conversation.push({
                    role: "assistant",
                    content: `I've read the file ${existingFileName} and now understand its current structure and content.`,
                  });
                  
                  // Continue the conversation with OpenAI
                  continue;
                }
              }

              // Normal response handling
              const text = message.content || "";
              // Send final "message" chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "message",
                    content: text,
                  })}\n\n`
                )
              );
              // Send end chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "end" })}\n\n`
                )
              );
              controller.close();
              return;
            }
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
    return streamingResponse;
  } catch (err) {
    console.error("Error in POST handler:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

// Helper function to extract potential file names from user messages
function extractPotentialFilenames(messages: any[]): string[] {
  if (!messages || messages.length === 0) return [];
  
  const fileNames: string[] = [];
  
  // Look at the last few messages, prioritizing the most recent one
  const recentMessages = messages.slice(-3).reverse();
  
  for (const message of recentMessages) {
    if (message.role !== 'user' || !message.content) continue;
    
    // Look for patterns like "file.md", "file-name.md", etc.
    const content = message.content;
    const mdFileRegex = /\b([a-zA-Z0-9-]+\.md)\b/g;
    let match;
    
    while ((match = mdFileRegex.exec(content)) !== null) {
      const fileName = match[1];
      if (!fileNames.includes(fileName)) {
        fileNames.push(fileName);
      }
    }
    
    // Also look for phrases like "remove from X" or "edit X" where X might be a file name
    const actionPhrases = [
      /\b(?:edit|modify|update|change|remove from|delete from|add to)\s+([a-zA-Z0-9-]+\.md)\b/gi,
      /\bin\s+([a-zA-Z0-9-]+\.md)\b/gi,
      /\bfile\s+([a-zA-Z0-9-]+\.md)\b/gi,
    ];
    
    for (const regex of actionPhrases) {
      while ((match = regex.exec(content)) !== null) {
        const fileName = match[1];
        if (!fileNames.includes(fileName)) {
          fileNames.push(fileName);
        }
      }
    }
  }
  
  return fileNames;
}