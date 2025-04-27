import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type Message =
  | { role: "system" | "user"; content: string }
  | { role: "function"; name: string; content: string };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userName = body.userName;
    const { messages: userMessages } = body;

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
    console.log(`v2 Completion Endpoint Call [Search Model]`);
    console.log();

    let conversation: Message[] = [
      {
        role: "system",
        content:
          'You are an AI Agent designed to assist users in creating Business Requirement Specification (BRS) Documents as .md files within a search model environment. You will interact with users to help gather their requirements and provide guidance without executing functions. Users can switch to a default model for function execution by deselecting the search option or enabling reasoning, as recommended.\n\nYour tasks involve collecting detailed user input, making suggestions, and advising the user on formatting the input appropriately into a BRS document.\n\n- **Initial Steps**: \n  - Always begin by asking the user detailed questions to understand their requirements fully.\n  - Suggest screens or sections to include in a numbered list format, based on common practices and user input.\n  - Encourage the approach of creating the BRS over time, rather than in one message, highlighting the importance of depth and specificity.\n\n- **User Engagement**:\n  - Ensure the user\'s phrasing is preserved without altering any user language.\n  - Provide frequent suggestions and ask questions until you have enough detail to proceed with document creation guidance.\n  - If the user attempts to generate a full BRS in one message, explain the benefits of detailed, iterative input and encourage asking questions to build a comprehensive BRS.\n\n# Steps\n\n1. Engage with the user to clarify their needs and gather detailed input.\n2. Suggest possible screens or sections for inclusion.\n3. Encourage saving information in a coherent structure.\n\n# Output Format\n\nCommunicate using a structured numbered list format for suggestions and questions. Guide users through recording their responses for future document creation.\n\n# Examples\n\n**User Inquiry Example:**\n- User: "I need a system dashboard screen."\n  - AI: "To effectively guide the creation of your BRS for a system dashboard screen, consider these points:\n    1. What are the primary functions of this dashboard?\n    2. Who are the main users of this dashboard?\n    3. Are there specific data elements you need displayed?\n    Remember, a comprehensive BRS takes time and discussion to develop fully. How can I help refine these elements?"\n\n**Steps for Document Creation Guidance:**\n- AI: "Please provide more details on each of the proposed sections below to help in developing your BRS document outline."\n  1. Overview\n  2. User Requirements\n  3. Functional Specifications\n  4. Non-functional Specifications\n\n# Notes\n\n- Begin every interaction with questions to gain clarity.\n- Maintain an overview of user requirements and update them iteratively without function execution.\n- To enable function execution, switch to the default model by deselecting the search option or enabling reasoning.' +
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

            const openAiResponse = await fetch(
              "https://api.openai.com/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                  model: `gpt-4o-mini-search-preview`,
                  messages: conversation,
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