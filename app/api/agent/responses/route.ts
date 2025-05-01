// Agent API route
/**
 * Inputs:
 *  - Model
 *  - Conversation
 *  - Files
 *
 * Validation:
 *  - Validate Model ID
 *  - Ensure user message is most recent message is user, not assistant or agent
 *
 * Vector store ID for file uploads: vs_68105b5138988191b34dda8e0818e57d
 *
 * Output:
 *  Output is in chunks, chunks come in a few types:
 *      - Log block (Updates on how things are going with logs)
 *      - Message block (Contains message content)
 *      - Function call block (Informs user about a function being called)
 *
 * It is a POST request with streaming blocks output
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { registerRequest, removeRequest, shouldCancelRequest } from "../stop/route";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Vector store ID for file search functionality
const VECTOR_STORE_ID = "vs_68105b5138988191b34dda8e0818e57d";

// Helper functions for file operations
async function create_file(filename: string) {
  try {
    const response = await fetch("http://localhost:3000/api/files/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_name: filename }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to create file: ${response.status} ${response.statusText}`
      );
      console.error(`Error details: ${errorText}`);
      return {
        success: false,
        error: `Server error (${response.status}): ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in create_file:`, error);
    return {
      success: false,
      error: `Failed to create file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function write_initial_data(user_inputs: string, brs_file_name: string) {
  try {
    const response = await fetch(
      "http://localhost:3000/api/files/writeInitialData",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name: brs_file_name, data: user_inputs }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to write initial data: ${response.status} ${response.statusText}`
      );
      console.error(`Error details: ${errorText}`);
      return {
        success: false,
        error: `Server error (${response.status}): ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in write_initial_data:`, error);
    return {
      success: false,
      error: `Failed to write initial data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function implement_edits(user_inputs: string, file_name: string) {
  try {
    const response = await fetch(
      "http://localhost:3000/api/files/publishNewVersion",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name, data: user_inputs }),
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

    return await response.json();
  } catch (error) {
    console.error(`Error in implement_edits:`, error);
    return {
      success: false,
      error: `Failed to implement edits: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

async function read_file(file_name: string) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/files/readFile?file_name=${encodeURIComponent(
        file_name
      )}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to read file: ${response.status} ${response.statusText}`
      );
      console.error(`Error details: ${errorText}`);
      return {
        success: false,
        error: `Server error (${response.status}): ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in read_file:`, error);
    return {
      success: false,
      error: `Failed to read file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

export async function POST(request: NextRequest) {
  // Generate a unique request ID for this conversation
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  try {
    // Register this request as active
    registerRequest(requestId);
    
    const body = await request.json();
    const { messages, jdiMode = false, uploadedFileIds = [] } = body;

    // Validate required parameters
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, message: "Messages array is required" },
        { status: 400 }
      );
    }

    // Check that the last message is from the user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return NextResponse.json(
        { success: false, message: "Last message must be from the user" },
        { status: 400 }
      );
    }

    console.log("Agent Iyaad14 API Request:", {
      messagesCount: messages.length,
      jdiMode,
      hasUploadedFiles: uploadedFileIds.length > 0,
    });

    const functionCallLogs: { name: string; arguments: any }[] = [];

    // Base system prompt with modification for JDI mode if needed
    let systemPrompt =
      'You are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. You have functions to perform your tasks, which include creating files and writing initial data. You are an agent, not an assistant. Most of the time, you should expect to use meeting notes to generate a BRS.\n\nYour primary task-related functions and guidelines are as follows:\n\n- `create_file`: Use this function to create a BRS document. Ensure filenames have no spaces and end in .md.\n- `write_initial_data`: Use this function to initialize the document only when you have sufficient data for at least one screen. Avoid direct markdown input to the user. \n- `implement_edits`: Use this function for making any changes or edits to a document. Obtain a comprehensive overview of requested changes before proceeding.\n  \nYou should focus on extracting as much input from the user as possible, making frequent suggestions and improvements. Maintain user input verbatim and avoid modifying it. Engage interactively to understand the user\'s needs, iterating through clarifying questions and suggestions for screens or sections.\n\n# Steps\n\n1. **Create the File**: Start by using `create_file` to initialize a new empty BRS document.\n2. **Initialize Document**: Gather at least one screen\'s worth of information, then use `write_initial_data`.\n3. **Engage with the User**:\n   - Extract detailed information through interaction and suggested improvements.\n   - Treat BRS creation as a detailed, multi-week process, prompting for thorough input.\n   - Suggest screens or sections in a numbered list format.\n4. **Modify Files**: \n   - Assess and understand changes before using `implement_edits`.\n5. **Maintain Interaction**:\n   - Encourage detailed dialogue to clarify any vague inputs.\n   - Persistently record file names and user interactions for consistency.\n\n# Output Format\n\nEnsure all interactions are formatted as clear and concise instructions or questions. Avoid direct markdown input and only use functions to reflect actions.\n\n# File Search\n\nIf the user has uploaded any files, you can use the retrieval capability to find information within those uploaded files to help generate or update the BRS document. Always acknowledge when you are referencing information from uploaded files.\n\n# Examples\n\n- User wants to start a new BRS document:\n  - **Input**: "Create a BRS titled \'Project Apollo\'."\n  - **Function Call**: `create_file("ProjectApollo.md")`\n  - **Next Step**: Inquire about initial requirements to use `write_initial_data`.\n\n- User requests changes:\n  - **Input**: "Update the login screen requirements for usability."\n  - **Process**: Thoroughly discuss and clarify before using `implement_edits`. then run implement edits with the all the user inputs exactly as the user inputted\n\nYou are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. Your name is Agent Iyaad14, powered by FiNAC AI. You have functions do perform your tasks. You will use this prompt to understand how to create BRS documents. You can create_file to create a document. You will also provide users input for write_initial_data. BRS Documents are just .md files. You must create a file first, but you cannot do anything with the document. You must first call write_initial_data to initialize the document. You will only write the initial data as long as you have the information you need for at least one screen. If you want to update the content of the document, it is a different process, you must first get an overview of how you must implement the requested changes. Use implement_edits to make any changes to the file. In user_inputs, DIRECTLY PUT THE USERS MESSAGE, DO NOT MODIFY ANY OF THE USERS WORDS. You will provide what that the user has asked for. You must ask the user ask many questions as you can to make sure you understand what the user wants. Add the file_name of the file that needs to be edited and once you interact with a file, make sure you remember it for future use. A file name must have no spaces and must end in .md, If the user tries to generate a BRS in one message, you can create the BRS if they have provided detailed meeting notes, otherwise, let the user know that creating a BRS effectively cannot be done in one message and let them know that they can ask you for questions for writing out data for each screen, and you can make it detailed with their input. Your primary role is to simply extract as much input as you can from the user, making suggestions and improvements frequently. You suggest screens, sections, or items to add in a numbered list format and pass the user input into functions. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working to create a BRS. You should make sure you provide the best service possible to the user to accurately get an idea of what they want. You should sound like a human. It needs to be extremely specific, detailed and follow requirements. You will only do what the user has asked you to do, if the user is vague, you must ask questions until you can accurately create the rest of the BRS, you may provide suggestions to the user on potential screens to add, however most of the time, you will take the detailed meeting notes, make sure not to leave a single detail, fact, screen, module, or formula out at all to functions and other places you move data around to. You must never provide the direct outputs of a file back to the user after you complete an edit, nor can you provide the direct outputs of reading a file back to the user ever.\n\n# Notes\n\n- Use functions strictly in accordance with these guidelines.\n- Focus on accuracy and detail, ensuring all input is vivid and comprehensive.\n- If a user attempts to generate a BRS in one message, emphasize the process-oriented approach, encouraging detailed, interactive input to cover each screen.';

    // Add JDI mode instructions if enabled
    if (jdiMode) {
      systemPrompt +=
        "\n\n# JDI MODE ACTIVATED\nYou are in Just Do It (JDI) mode. Your approach should be highly proactive and action-oriented. Rather than asking questions, make immediate assumptions and take direct actions. If the user mentions a feature or screen, immediately create the necessary files and implement the content without seeking further clarification. Act decisively and autonomously based on the information available. If provided with meeting notes, use them to create comprehensive BRS documents immediately with minimal interaction. Speed and efficiency are paramount in JDI mode.";
    }

    // Create a new streaming response
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send verbose log messages
        const sendLog = (data: any) => {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "log", data })}\n\n`
            )
          );
        };

        try {
          sendLog({
            message: "Starting OpenAI request",
            count: messages.length,
          });

          // Set up function tools array
          const functionTools = [
            {
              type: "function",
              name: "create_file",
              strict: true,
              parameters: {
                type: "object",
                required: ["filename"],
                properties: {
                  filename: {
                    type: "string",
                    description:
                      "The name of the file, must be a valid name ending in .md and only include a-z, A-Z, dashes or numbers. No underscores",
                  },
                },
                additionalProperties: false,
              },
              description:
                "Creates a brs file, must end in .md, only a-z, A-Z, dashes too, but no underscores and all numbers, nothing else",
            },
            {
              type: "function",
              name: "write_initial_data",
              strict: true,
              parameters: {
                type: "object",
                required: ["brs_file_name", "user_inputs"],
                properties: {
                  user_inputs: {
                    type: "string",
                    description:
                      "Array of user-provided inputs relevant for writing the BRS content",
                  },
                  brs_file_name: {
                    type: "string",
                    description: "The name of the BRS file to write to",
                  },
                },
                additionalProperties: false,
              },
              description:
                "Writes the initial content for the first version of a BRS file, using relevant user inputs.",
            },
            {
              type: "function",
              name: "implement_edits",
              description:
                "Applies user inputs to the specified BRS file to make changes and edit the file",
              parameters: {
                type: "object",
                required: ["user_inputs", "file_name"],
                properties: {
                  user_inputs: {
                    type: "string",
                    description:
                      "The users requests and what the user has asked for. If there are any meeting notes at all, provide the metting notes in full over here in addition to the users inputs without changing anything",
                  },
                  file_name: {
                    type: "string",
                    description: "The name of the BRS file to be edited",
                  },
                },
                additionalProperties: false,
              },
              strict: true,
            },
            {
              type: "function",
              name: "read_file",
              description:
                "Reads the specified brs file before processing any user requests related to the file. This function allows you to get the inputs of the BRS file",
              parameters: {
                type: "object",
                required: ["file_name"],
                properties: {
                  file_name: {
                    type: "string",
                    description: "The name of the brs file to read",
                  },
                },
                additionalProperties: false,
              },
              strict: true,
            },
            {
              type: "file_search",
              vector_store_ids: [VECTOR_STORE_ID],
              max_num_results: 20,
            },
          ];

          // Create a request object for the OpenAI API
          const requestObj: any = {
            model: "gpt-4.1",
            input: [
              {
                role: "system",
                content: systemPrompt, // System prompt as the first message
              },
              // Spread the rest of the messages from the input body
              ...messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
              })),
            ],
            tools: functionTools,
            temperature: 1,
            max_output_tokens: 2048,
            top_p: 1,
          };

          // Check if request should be canceled before calling OpenAI
          if (shouldCancelRequest(requestId)) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "message",
                  content: "*Response canceled before processing*",
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

          // Call OpenAI responses API with the correctly structured request
          const response = await openai.responses.create(requestObj);

          let messageContentToSend: string | null = null;
          let messageSent = false; 
          let hasToolCalls = false; 

          // Process response content
          // First, check for output_text at the root level (for backward compatibility)
          if (
            typeof response.output_text === "string" &&
            response.output_text.trim() !== ""
          ) {
            console.log(
              "Using response.output_text at root level as message content"
            );
            messageContentToSend = response.output_text;
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "message",
                  content: messageContentToSend,
                })}\n\n`
              )
            );
            messageSent = true;
          }
          // Then process the output array (which is the newer format)
          else if (response.output && Array.isArray(response.output)) {
            console.log(
              "Processing response.output array with",
              response.output.length,
              "items"
            );

            for (const outputItem of response.output) {
              // Use type assertion to handle potential type mismatches
              const item = outputItem as any;
              console.log("Processing output item of type:", item.type);

              if (item.type === "message") {
                // --- Handle message type in output array ---
                console.log("Found message item in output array");

                // Check if content exists and is an array
                if (item.content && Array.isArray(item.content)) {
                  for (const contentItem of item.content) {
                    const contentItemAny = contentItem as any;

                    // Process output_text from content item
                    if (
                      contentItemAny.type === "output_text" &&
                      contentItemAny.text
                    ) {
                      messageContentToSend = contentItemAny.text;
                      console.log(
                        "Extracted text from message.content[].output_text:",
                        messageContentToSend
                      );

                      if (
                        messageContentToSend &&
                        messageContentToSend.trim() !== ""
                      ) {
                        controller.enqueue(
                          new TextEncoder().encode(
                            `data: ${JSON.stringify({
                              type: "message",
                              content: messageContentToSend,
                            })}\n\n`
                          )
                        );
                        messageSent = true;
                      }
                    }
                  }
                } else if (typeof item.content === "string") {
                  // Direct string content
                  messageContentToSend = item.content;
                  console.log(
                    "Extracted direct string content from message:",
                    messageContentToSend
                  );

                  if (
                    messageContentToSend &&
                    messageContentToSend.trim() !== ""
                  ) {
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({
                          type: "message",
                          content: messageContentToSend,
                        })}\n\n`
                      )
                    );
                    messageSent = true;
                  }
                }
              } else if (
                item.type === "tool_calls" ||
                item.type === "function_call"
              ) {
                // --- Handle tool calls within the output array ---

                if (item.type === "function_call") {
                  // Direct function call format
                  hasToolCalls = true;
                  console.log("Found direct function_call in output array");

                  const name = item.name;
                  let functionArgs: any;

                  if (typeof item.arguments === "string") {
                    try {
                      functionArgs = JSON.parse(item.arguments);
                    } catch (error) {
                      console.error("Error parsing function arguments:", error);
                      functionArgs = {};
                    }
                  } else {
                    functionArgs = item.arguments || {};
                  }

                  functionCallLogs.push({ name, arguments: functionArgs });

                  console.log("Function Called:", name);
                  console.log("Parameters:", functionArgs);

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "function",
                        data: name,
                        parameters: functionArgs,
                      })}\n\n`
                    )
                  );

                  let functionResult;
                  if (name === "create_file") {
                    functionResult = await create_file(functionArgs.filename);
                  } else if (name === "write_initial_data") {
                    functionResult = await write_initial_data(
                      functionArgs.user_inputs,
                      functionArgs.brs_file_name
                    );
                  } else if (name === "implement_edits") {
                    functionResult = await implement_edits(
                      functionArgs.user_inputs,
                      functionArgs.file_name
                    );
                  } else if (name === "read_file") {
                    functionResult = await read_file(functionArgs.file_name);
                  } else {
                    functionResult = {
                      success: false,
                      error: `Unknown function: ${name}`,
                    };
                  }

                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "functionResult",
                        data: functionResult,
                      })}\n\n`
                    )
                  );
                } else {
                  // Tool calls array format
                  // Extract tool_calls based on the format (directly or in a property)
                  const toolCalls = item.tool_calls || [];

                  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                    hasToolCalls = true; // Mark that tool calls are present
                    console.log(
                      "Found tool_calls in output array:",
                      toolCalls.length
                    );

                    for (const toolCall of toolCalls) {
                      if (
                        toolCall &&
                        toolCall.type === "function" &&
                        toolCall.function
                      ) {
                        const { name } = toolCall.function;
                        let functionArgs: any;

                        if (typeof toolCall.function.arguments === "string") {
                          try {
                            functionArgs = JSON.parse(
                              toolCall.function.arguments
                            );
                          } catch (error) {
                            console.error(
                              "Error parsing function arguments:",
                              error
                            );
                            functionArgs = {};
                          }
                        } else {
                          functionArgs = toolCall.function.arguments || {};
                        }

                        functionCallLogs.push({
                          name,
                          arguments: functionArgs,
                        });

                        console.log("Function Called:", name);
                        console.log("Parameters:", functionArgs);

                        controller.enqueue(
                          new TextEncoder().encode(
                            `data: ${JSON.stringify({
                              type: "function",
                              data: name,
                              parameters: functionArgs,
                            })}\n\n`
                          )
                        );

                        let functionResult;
                        if (name === "create_file") {
                          functionResult = await create_file(
                            functionArgs.filename
                          );
                        } else if (name === "write_initial_data") {
                          functionResult = await write_initial_data(
                            functionArgs.user_inputs,
                            functionArgs.brs_file_name
                          );
                        } else if (name === "implement_edits") {
                          functionResult = await implement_edits(
                            functionArgs.user_inputs,
                            functionArgs.file_name
                          );
                        } else if (name === "read_file") {
                          functionResult = await read_file(
                            functionArgs.file_name
                          );
                        } else {
                          functionResult = {
                            success: false,
                            error: `Unknown function: ${name}`,
                          };
                        }

                        controller.enqueue(
                          new TextEncoder().encode(
                            `data: ${JSON.stringify({
                              type: "functionResult",
                              data: functionResult,
                            })}\n\n`
                          )
                        );
                      }
                    }
                  }
                }
              } else if (item.type === "text") {
                // Handle legacy text object format for compatibility
                const rawText = item.text;
                if (rawText && typeof rawText === "string") {
                  messageContentToSend = rawText;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "message",
                        content: messageContentToSend,
                      })}\n\n`
                    )
                  );
                  messageSent = true;
                } else if (
                  rawText &&
                  typeof rawText === "object" &&
                  rawText.value
                ) {
                  messageContentToSend = rawText.value;
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: "message",
                        content: messageContentToSend,
                      })}\n\n`
                    )
                  );
                  messageSent = true;
                }
              } else {
                console.log(`Skipping unknown output item type: ${item.type}`);
              }
            }
          }
          // Finally check for tool_calls at the root level (for backward compatibility)
          else if (
            "tool_calls" in response &&
            Array.isArray(response.tool_calls) &&
            response.tool_calls.length > 0
          ) {
            console.log("Using tool_calls at root level");
            hasToolCalls = true;
            const toolCalls = response.tool_calls;

            // Process the tool calls (reusing the existing code)
            for (const toolCall of toolCalls) {
              if (
                toolCall &&
                toolCall.type === "function" &&
                toolCall.function
              ) {
                const { name } = toolCall.function;
                let functionArgs: any;

                if (typeof toolCall.function.arguments === "string") {
                  try {
                    functionArgs = JSON.parse(toolCall.function.arguments);
                  } catch (error) {
                    console.error("Error parsing function arguments:", error);
                    functionArgs = {};
                  }
                } else {
                  functionArgs = toolCall.function.arguments || {};
                }

                functionCallLogs.push({ name, arguments: functionArgs });

                console.log("Function Called (root level):", name);
                console.log("Parameters:", functionArgs);

                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "function",
                      data: name,
                      parameters: functionArgs,
                    })}\n\n`
                  )
                );

                let functionResult;
                if (name === "create_file") {
                  functionResult = await create_file(functionArgs.filename);
                } else if (name === "write_initial_data") {
                  functionResult = await write_initial_data(
                    functionArgs.user_inputs,
                    functionArgs.brs_file_name
                  );
                } else if (name === "implement_edits") {
                  functionResult = await implement_edits(
                    functionArgs.user_inputs,
                    functionArgs.file_name
                  );
                } else if (name === "read_file") {
                  functionResult = await read_file(functionArgs.file_name);
                } else {
                  functionResult = {
                    success: false,
                    error: `Unknown function: ${name}`,
                  };
                }

                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      type: "functionResult",
                      data: functionResult,
                    })}\n\n`
                  )
                );
              }
            }
          }

          // First, check if the request was canceled during processing
          if (shouldCancelRequest(requestId)) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "message",
                  content: "*Response canceled during processing*",
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

          // Last resort: check for text at the root level if we haven't sent anything yet
          if (!messageSent && !hasToolCalls && "text" in response) {
            console.log(
              "No content found in output array, checking root level text property"
            );
            const rawText = response.text as unknown as any;
            if (typeof rawText === "string" && rawText.trim() !== "") {
              messageContentToSend = rawText;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "message",
                    content: messageContentToSend,
                  })}\n\n`
                )
              );
              messageSent = true;
            } else if (
              typeof rawText === "object" &&
              rawText !== null &&
              "value" in rawText
            ) {
              messageContentToSend = (rawText as any).value;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "message",
                    content: messageContentToSend,
                  })}\n\n`
                )
              );
              messageSent = true;
            }
          }

          // Log only if NEITHER text NOR tool calls were found/processed
          if (!messageSent && !hasToolCalls) {
            console.log(
              "OpenAI response processing complete, but NO usable text content OR tool calls were found."
            );
          }

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "end" })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Error in OpenAI request:", error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
              })}\n\n`
            )
          );
          controller.close();
        } finally {
          // Always remove the request ID when done
          removeRequest(requestId);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    // Always remove the request ID in case of error
    removeRequest(requestId);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error processing request",
      },
      { status: 500 }
    );
  }
}