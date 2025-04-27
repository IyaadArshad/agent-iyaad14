All API Routes Will Follow Format.

Regular:
{
    success: true,
    message: "Human readable message",
    systemMessage: "OpenAI models use to know what is going on / what action to take"
}

Streaming blocks:

// 1. Supermodel stream
Don't need openai message format streaming
Will implement these chunks.

Types of chunks
- Function chunks (Shows functions called / functions status)
- Message Chunks (Provides the openai model response)
- End chunk (Summary)