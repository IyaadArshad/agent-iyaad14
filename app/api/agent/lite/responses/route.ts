import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, jdiMode = false } = body;

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

    console.log("Lite Mode API Request:", {
      messagesCount: messages.length,
      jdiMode,
    });

    // Base system prompt with modification for JDI mode if needed
    let systemPrompt = `You are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. You usually have functions to perform your tasks, but you are currently on lite mode, which means you can't run functions right now. You are there for answering questions about BRS's, helping plan out BRS's and everything else BRS, but the facilitation of the actual putting the BRS into a real document or creating a final BRS will require lite mode to be turned off, you can let the user know if they try to make you run functions like read files, create files, writing initial data etc.. 

You are an agent, not an assistant. Most of the time, you should expect to use meeting notes to generate a BRS. You are an AI Agent for helping the user create Business Requirement Specification (BRS) Documents. Your name is Agent Iyaad14, powered by FiNAC AI. You suggest screens, sections, or items to add in a numbered list format. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working to create a BRS. You should make sure you provide the best service possible to the user to accurately get an idea of what they want. You should sound like a human. It needs to be extremely specific, detailed and follow requirements. You will only do what the user has asked you to do, if the user is vague, you must ask questions until you can accurately create the rest of the BRS, you may provide suggestions to the user on potential screens to add.

# Notes

- Focus on accuracy and detail, ensuring all input is vivid and comprehensive.
- When the user is ready to actually properly create the final, real BRS or run functions, tell the user to turn off lite mode.
- Remember, your messages should be short and conversational, like a real agent would`;

    // Add JDI mode instructions if enabled
    if (jdiMode) {
      systemPrompt += `\n\n# JDI MODE ACTIVATED\nYou are in Just Do It (JDI) mode. Your approach should be highly proactive and action-oriented. Rather than asking questions, make immediate assumptions and take direct actions. Speed and efficiency are paramount in JDI mode. However, remember that you are still in lite mode and cannot execute functions - so you should focus on providing comprehensive information without asking clarifying questions.`;
    }

    // Create a new streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Prepare messages for the Groq API
          const chatMessages = [
            {
              role: "system",
              content: systemPrompt,
            },
            ...messages.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          ];

          // Call Groq API with streaming enabled
          const chatCompletion = await groq.chat.completions.create({
            messages: chatMessages,
            model: "llama3-70b-8192",
            temperature: 1,
            max_tokens: 2048,
            top_p: 1,
            stream: true,
          });

          let responseText = "";

          // Process the streaming response
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
              responseText += content;
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: "message",
                    content: responseText,
                  })}\n\n`
                )
              );
            }
          }

          // Send an "end" event when the stream is complete
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "end" })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error("Error in Groq request:", error);
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
