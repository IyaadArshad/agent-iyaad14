import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.SPECIAL_KEY!,
});

/**
 * demo input:
 * {
 * "messages": [
 *  {
 *   "role": "user",
 *  "content": "What can you do?"
 * }
 * ]
 * }
 */
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

async function write_initial_data(file_name: string, data: string) {
  const response = await fetch(
    "http://localhost:3000/api/legacy/data/writeInitialData",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name, data }),
    }
  );
  const responseData = await response.json();
  if (!response.ok) {
    console.error(`Failed to write initial data: ${response.statusText}`);
    return { success: false, error: responseData.message };
  }
  return responseData;
}

async function implement_edits(user_inputs: string, file_name: string) {
  const response = await fetch(
    "http://localhost:3000/api/v2/models/implement_edits",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_inputs, file_name }),
    }
  );

  const responseData = await response.json();
  if (!response.ok) {
    console.error(`Failed to implement overview: ${response.statusText}`);
    return { success: false, error: responseData.message };
  }
  return responseData;
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
    // model 1 = gpt-4.1
    // model 2 = gpt-4.1
    // model 2 = o4-mini
    // search option
    const search = body.search || false;
    const model = body.model || 2;
    if (!body.messages) {
      return NextResponse.json(
        { error: "messages is required" },
        { status: 400 }
      );
    }
    const { messages: userMessages } = body;

    console.log();
    console.log("Supermodel API Request Called");
    console.log();

    const functionCallLogs: { name: string; arguments: any }[] = [];

    type Message =
      | { role: "system" | "user"; content: string }
      | { role: "tool"; tool_call_id: string; content: string };

    let defaultModel;
    let openModel;

    if (model === 1) {
      openModel = "gpt-4.1";
    } else if (model === 2) {
      openModel = "gpt-4.1";
    } else if (model === 3) {
      openModel = "gpt-4.1";
    } else {
      openModel = "gpt-4.1";
      defaultModel = true;
    }

    let conversation: Message[] = [
      {
        role: "system",
        content:
          'You have functions do perform your tasks. You will use this prompt to understand how to create BRS documents. You can create_file to create a document. You will also provide the input for write_initial_data. BRS Documents are just .md files. You must create a file first, but you cannot do anything with the document. You must first write some initial data to the document. You will only write the initial data as long as you have the information you need for at least one screen. DO NOT EVER DIRECTLY PUT MARKDOWN TO THE USER. ONLY USE FUNCTIONS. If you want to update the content of the document, it is a different process, you must first get an overview of how you must implement the requested changes. Use implement_edits to make any changes to the file. In user_inputs, DIRECTLY PUT THE USERS MESSAGE, DO NOT MODIFY ANY OF THE USERS WORDS. You will provide what that the user has asked for. Do not change anything the user has asked. Add the file_name of the file that needs to be edited. If the user tries to generate a BRS in one message, Let the user know that creating a BRS effectively cannot be done in one message and let them know that they can ask you for questions for writing out data for each screen, and you can make it detailed with their input. Creating a Business Requirements Specification (BRS) document in markdown can be done using a document title at the beginning. Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! You will only do what the user has asked you to do, if the user is vague, you must ask questions until you can accurately create the rest of the BRS, you may provide suggestions to the user on potential screens to add. Only add screens to the document if the user has instructed you to do it. Do not be afraid to ask for clarifications or further detail. If the user puts alot of screens in one message, you will remember all the user says as context and proceed slowly step by step. Think carefully about what the user has asked about, ask the user for any missing details and if you feel like you have to assume something, you must ask the user. You have to be as clear as possible in an BRS.  For your reference, here is what a BRS is like: "At the topmost section of the document, there is the main heading. A simple, concise H1 title (#) that is 4-5 words (Example: MIS Control Module). A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple sentence explaining the screen. Use casual language for this one, but don\'t be unprofessional. usually simple language that gets the point across. This doesn\'t always need to be there. Most of the time, this second section isn\'t there anyway. Just keep in mind this exists though. The third section is the diagram. The fourth and last section of every screen is the extra data. There will always be some for of a short 1-2  sentence description in 1 or 2 lines.  This could be adding a table for some same data, tables to specify form field types, bullet points for extra info, etc.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this." You may create a file with some info, but you must have obtained information for at least one of the screens that the user has requested, and you may keep updating the file after each screen designed if the user is designing screens one by one. You will not use bullet points to display lists with 1 item or less. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. Do not talk, discuss or do anything related to anything too far outside context of the brs. Never display the brs diagram placeholder or any other markdown elements directly to the user in your assistant response EVER. all markdown, document elements and diagrams belong in the files you create and update. NEVER SHOW PREVIEWS OF YOUR BRS FILES. NEVER PUT BRS ELEMENTS IN YOUR RESPONSE' +
          "You are ChatGPT, modified to work as a Business Requirements Specification (BRS) AI Agent. IMPORTANT RULES:\n\n" +
          "1. Never display raw markdown file contents directly to users\n" +
          "2. When using implement_edits, pass the exact user message without modification\n" +
          "3. After implementing edits, summarize the changes made in natural language\n" +
          "4. Do not read and display file contents back to users. You may summarize or list contents or screens of the document though.\n" +
          "5. Focus on facilitating the creation and modification of BRS documents\n" +
          "6. When calling a function involving a file, you must let the user know of the file name wrapped in the markdown code to make what file you are working with clear" +
          "7. Do not use underscores in file names, and do not use spaces." +
          "8. Whenever the user asks a question about a file that may have been updated, read the file again before answering." +
          "8. Some screen names will have brackets after their name to indicate a screen where a user performs actions" +
          "9. You can use tables to display sample data and information. Make sure you use appropriate field headers" +
          `You needs to be on top of the user asking questions and making it detailed. As an AI agent, you should be expected to think beyond what you were asked to do. For example, if you are asked to create a one screen library management system only tracking books using crud for storage, you needs to think deeply and step by step. Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, it should be extremely specific and assume details it doesn't know. in the module example, it should explain how the module processes user input and how it displays output, plans for the ui, for example in the read books module it suggests a plan "
1. The user would be required to input the name of the book they are querying
2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
4. The system should validate the input to ensure the book name exists in the database.
5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
6. The retrieved details are displayed in a user-friendly format on the UI.
7. If the book name is not found, the system should display an appropriate error message to the user.
8. The UI should provide an option to go back to the main menu or perform another search.
". Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core.`,
      },
      ...userMessages,
    ];

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 500 }
      );
    }

    const streamingResponse = new Response(
      new ReadableStream({
        async start(controller) {
          const sendVerbose = (data: any) => {
            // Filter out system messages from conversation logs
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

          if (search) {
            searchContent = {
              name: "search",
              description:
                "Search for information on the internet via Google. If this function is here, the user has enabled it. Always perform a search to ensure accurate, up to date information",
              parameters: {
                type: "object",
                required: ["query"],
                properties: {
                  query: { type: "string" },
                },
              },
            };
          }

          while (true) {
            sendVerbose({ message: "Starting OpenAI request", conversation });

            const openAiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: `o4-mini`,
                  reasoning_effort: `high`,
                  messages: conversation,
                  tools: [
                    {
                      type: "function",
                      function: {
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
                    },
                    {
                      type: "function",
                      function: {
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
                    },
                    {
                      type: "function",
                      function: {
                        name: "implement_edits",
                        description:
                          "Update the BRS document with the user's requested changes. Provide the user's inputs",
                        parameters: {
                          type: "object",
                          required: ["user_inputs", "file_name"],
                          properties: {
                            user_inputs: { type: "string" },
                            file_name: { type: "string" },
                          },
                        },
                      },
                    },
                    {
                      type: "function",
                      function: {
                        name: "write_initial_data",
                        description:
                          "Writes initial data for version one for a file. You must call this to write initial data to a .md BRS file",
                        parameters: {
                          type: "object",
                          required: ["file_name", "data"],
                          properties: {
                            data: { type: "string" },
                            file_name: { type: "string" },
                          },
                        },
                      },
                    },
                    ...(searchContent
                      ? [
                          {
                            type: "function",
                            function: {
                              name: searchContent.name,
                              description: searchContent.description,
                              parameters: searchContent.parameters,
                            },
                          },
                        ]
                      : []),
                  ],
                  // temperature: 1.37,
                  // top_p: 0.68,
                  // frequency_penalty: 0.35,
                  // presence_penalty: 0,
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

            if (message.tool_calls && message.tool_calls.length > 0) {
              const toolCall = message.tool_calls[0];
              const name = toolCall.function.name;
              const args = toolCall.function.arguments;
              const functionArgs = JSON.parse(args);

              functionCallLogs.push({ name, arguments: functionArgs });

              let functionResult;

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
                functionResult = await create_file(functionArgs.file_name);
              } else if (name === "write_initial_data") {
                functionResult = await write_initial_data(
                  functionArgs.file_name,
                  functionArgs.data
                );
              } else if (name === "implement_edits") {
                functionResult = await implement_edits(
                  functionArgs.user_inputs,
                  functionArgs.file_name
                );
              } else if (name === "read_file") {
                functionResult = await read_file(functionArgs.file_name);
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
                  functionResult = responseData
                    ? JSON.parse(responseData)
                    : { success: false, error: "Empty response" };
                } catch (error) {
                  console.error(`Failed to perform search: ${error}`);
                  functionResult = {
                    success: false,
                    error: "Failed to process search results",
                  };
                }
              } else {
                console.error(`Function ${name} not found.`);
                throw new Error(`Function ${name} not found.`);
              }

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
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult),
              });
            } else {
              const text = message.content || "";
              // Send final "message" chunk
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "message",
                    content: text,
                    openModel,
                    model,
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