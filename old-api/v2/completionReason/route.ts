import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Message =
  | { role: "system" | "user"; content: string }
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
  const text = await response.text();
  let responseData;
  try {
    responseData = text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`Failed to parse JSON in create_file: ${error}`);
    responseData = {};
  }
  if (!response.ok) {
    console.error(`Failed to create file: ${response.statusText}`);
    return {
      success: false,
      error: responseData.message || "No error message",
    };
  }
  return responseData;
}

async function write_initial_data(user_inputs: string, file_name: string) {
  const response = await fetch(
    "http://localhost:3000/api/v2/models/writeInitialData",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_inputs, file_name }),
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

async function implement_edits(user_inputs: string, file_name: string) {
  const response = await fetch(
    "http://localhost:3000/api/v2/models/implement_edits",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_inputs, file_name }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `Failed to implement edits: ${response.status} ${response.statusText}`
    );
    console.error(`Error details: ${errorText}`);
    return {
      success: false,
      error: `Server error (${response.status}): ${response.statusText}`,
    };
  }

  try {
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error(`Failed to parse JSON response: ${error}`);
    return {
      success: false,
      error: `Failed to parse server response: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
    console.log(`v2 Completion Endpoint Call [Updated Reasoning Model]`);
    console.log();

    let conversation: Message[] = [
      {
        role: "system",
        content:
          `You are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. You have functions do perform your tasks. You will use this prompt to understand how to create BRS documents. You can create_file to create a document. You will also provide users input for write_initial_data. BRS Documents are just .md files. You must create a file first, but you cannot do anything with the document. You must first call write_initial_data to initialize the document. You will only write the initial data as long as you have the information you need for at least one screen. DO NOT EVER DIRECTLY PUT MARKDOWN TO THE USER. ONLY USE FUNCTIONS. If you want to update the content of the document, it is a different process, you must first get an overview of how you must implement the requested changes. Use implement_edits to make any changes to the file. In user_inputs, DIRECTLY PUT THE USERS MESSAGE, DO NOT MODIFY ANY OF THE USERS WORDS. You will provide what that the user has asked for. You must ask the user ask many questions as you can to make sure you understand what the user wants. Add the file_name of the file that needs to be edited and once you interact with a file, make sure you remember it for future use. A file name must have no spaces and must end in .md, If the user tries to generate a BRS in one message, Let the user know that creating a BRS effectively cannot be done in one message and let them know that they can ask you for questions for writing out data for each screen, and you can make it detailed with their input. Your primary role is to simply extract as much input as you can from the user, making suggestions and improvements frequently. You suggest screens, sections, or items to add in a numbered list format and pass the user input into functions. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working to create a BRS. You should make sure you provide the best service possible to the user to accurately get an idea of what they want. You should sound like a human. It needs to be extremely specific, detailed and follow requirements. You will only do what the user has asked you to do, if the user is vague, you must ask questions until you can accurately create the rest of the BRS, you may provide suggestions to the user on potential screens to add.` +
          `Context: The users name is ${body.userName}`,
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
            
            // Filter out unsupported "function" role messages for o4-mini model
            const apiMessages = conversation.filter((msg) => msg.role !== "function");
            
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
                  messages: apiMessages, // use the filtered messages
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
                    {
                      name: "write_initial_data",
                      description:
                        "Writes initial data for version one for a file. You must call this to write initial data to a .md BRS file, provide the user input, what they asked for without changing it and the name of the file that you created",
                      parameters: {
                        type: "object",
                        required: ["user_inputs", "file_name"],
                        properties: {
                          user_inputs: { type: "string" },
                          file_name: { type: "string" },
                        },
                      },
                    },
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
                  functionArgs.user_inputs,
                  functionArgs.file_name
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
                role: "function",
                name,
                content: `Function ${name} was called with result: ${JSON.stringify(
                  functionResult
                )}`,
              });
            } else {
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