import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // Step 1: Parse and validate user inputs (file_name and input)
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ code: 500, message: "Missing OpenAI API key" });
  }

  let params;
  try {
    params = await request.json();
    if (!params.input || !params.file_name) {
      return Response.json({
        code: 400,
        message: "input and file_name are required",
      });
    }
  } catch (error) {
    return Response.json({ code: 400, message: "Invalid JSON payload" });
  }

  const input = params.input;
  const file_name = params.file_name;

  try {
    // Step 2: Read the file contents and store result in file_contents
    const file_contents_fetch = await fetch(
      `http://localhost:3000/api/legacy/data/readFile?file_name=${encodeURIComponent(
        file_name
      )}`,
      {
        headers: { "Cache-Control": "no-cache" },
      }
    );
    console.log(file_contents_fetch);
    if (!file_contents_fetch.ok) {
      const errorText = await file_contents_fetch.text();
      throw new Error(`Error fetching file contents: ${errorText}`);
    }
    let file_contents;
    try {
      file_contents = await file_contents_fetch.json();
    } catch (jsonError) {
      throw new Error("Invalid JSON response from file read");
    }

    if (!file_contents.success) {
      if (file_contents.code === 404) {
        return Response.json({
          code: 404,
          message: "File not found",
        });
      }
      throw new Error(file_contents.message || "Error reading file");
    }

    if (file_contents.v0) {
      return Response.json({
        code: 400,
        message: "Cannot create prompts for a file with no versions",
      });
    }

    // Step 3: Pass file contents and user input to generate the overview prompt
    const systemPrompt = `You create prompts for prompting making changes to a document. You will receive the input of the user requesting changes. You will provide back, nothing else but 1. a short sentence starting with "I'll" in your point of view in under 30 words explaining what you're going to do (from the point of the view of the receiving the final view), (example: I'll help you do x changes) Then put a new line. Then put a small paragraph saying "Step by step changes:" then below, put a numbered list of all the changes that need to be made. Be precise, but each point should not be too long. These steps should be clear and definitive to tell what to do to implement the requested changes. There should not be too many points though. Do not exclude details that the user mentioned. Your main objective with these numbered lists is to provide a prompt on what changes need to be made in a clear manner, understanding of what the user originally wanted, but clearer. Know that you are working in a document creation app for context. Know that your prompt will be visible to the user for understanding purposes and will be given to an artificial intelligence model to complete the task, using internal applications if necessary. Do not mention tasks for the user like "opening document creation application, save the file, etc.", just "Create a new file name "x.md" is enough for such things. Make sure to be clear if the user just wants to add more to the file, change a specific section, or to remove entire sections. you must be clear, otherwise, you may accidently create a prompt that deletes part of the document that the user wanted to keep. Note that you should not mention creating files as steps. For your reference, read the format of a brs: "Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple paragraph explaining the screen. You may use bold text, italics, bullet points or other visual aids to accompany this paragraph in this second section. It needs to be a brief overview. Use simple language that gets the point across without being unprofessional. The third section is the diagram. If this is a UI based function, then you add a diagram with a json markdown code block containing json {"brsDiagram": {}} The fourth and last section of every screen is the extra data. This is the last section, but it the main part of the screen information. It contains all the details and specifications, you must break down, decompose, and fully explain everything that the screen does, including explaining individual functions, adding tables or bullet points to specify data types, validation, inputs etc. You will also break it down fully for each module, each screen has modules and each models must have a properly explained inputs, processes, and outputs. There will always be some for of a short 1-2  sentence description in 1 or 2 lines too.  This could be adding a table for some sample data, tables to specify form field types, bullet points for extra info, etc. If sample data is there, make sure it is at least 7 rows.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this. You will not use bullet points to display lists with only 1 item, they should never feel empty. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. EXTEMELY IMPORTANT: You should be expected to think beyond what you were asked to do. You must assume and think hard about what the users requirements are, what the user implicitly might want too and add it in. Be detailed about it. For example, if you are asked to "create a one screen library management system only tracking books using crud for storage". Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, etc. each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, you should be extremely specific and assume details you doesn't know. in the module example for example, you should explain how the module processes user input and how it displays output and, plans for the ui, for example in the read books module it suggests a plan for example you could add "
                      1. The user would be required to input the name of the book they are querying
                      2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
                      4. The system should validate the input to ensure the book name exists in the database.
                      5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
                      6. The retrieved details are displayed in a user-friendly format on the UI.
                      7. If the book name is not found, the system should display an appropriate error message to the user.
                      8. The UI should provide an option to go back to the main menu or perform another search.
                      " Understand this example and think hard about the kind of BRS quality I expect. Know that this is an example and it is different depending on each users requests, but understand what I mean by you should go the extra mile to be specific. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table where you think it will look good. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core. Make sure a BRS never looks empty to anyone." understand and now remember how a brs is structured and keep in mind that your role is simply to create the overview prompt (the step by step plan to implement the changes they want)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1", // Use gpt-4.1 for the overview creation (chain-of-thought)
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${input}` },
      ],
      temperature: 0.7,
      // ... other parameters
    });

    return Response.json({
      code: 200,
      prompt: response.choices[0].message.content,
      file_contents: file_contents.data,
    });
  } catch (error) {
    console.error("Error in overview generation:", error);
    return Response.json({
      code:
        error && typeof error === "object" && "code" in error
          ? (error as { code: number }).code
          : 500,
      message:
        error && typeof error === "object" && "message" in error
          ? (error as { message: string }).message
          : "Error generating overview",
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            }
          : error,
    });
  }
}