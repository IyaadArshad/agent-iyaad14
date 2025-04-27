import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  let params;
  try {
    params = await request.json();
    if (!params.line || !params.document_lines) {
      return Response.json({ code: 400, message: "line and document lines are required" });
    }
  } catch (error) {
    return Response.json({ code: 400, message: "Invalid JSON payload" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ code: 500, message: "Missing OpenAI API key" });
  }

  const line = params.line;
  const document_lines = params.document_lines;

  const systemPrompt = `
You are an intelligent document completion assistant specializing in providing autocomplete suggestions.
Based on the current document, provide a concise and relevant continuation of the current line the user is on.
Ensure the suggestion aligns with the existing code structure and context.
Return only the continuation without any additional text.
It should be short and concise and under a line

Document context:
${document_lines}
`;

  const prompt = `Current line of code:
${line}

Provide an appropriate continuation for the above line.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    const suggestion = response.choices[0]?.message?.content?.trim() ?? '';

    return Response.json({
      code: 200,
      suggestion,
    });
  } catch (error) {
    return Response.json({ code: 500, message: "Error generating suggestion" });
  }
}