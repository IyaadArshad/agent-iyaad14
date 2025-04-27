import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  let params;
  try {
    params = await request.json();
    if (!params.overview || !params.file_name) {
      return Response.json({
        code: 400,
        message: "overview and file_name are required",
      });
    }
  } catch (error) {
    return Response.json({ code: 400, message: "Invalid JSON payload" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ code: 500, message: "Missing OpenAI API key" });
  }

  const overview = params.overview;
  const file_name = params.file_name;

  console.log("PARAM OVERVIEW", overview);
  console.log("PARAM FILENAME", file_name);

  const file_contents_fetch = await fetch(
    `http://localhost:300/api/generative/functions/read_file?file_name=${file_name}`
  );
  const file_contents = await file_contents_fetch.json();

  const Sysprompt = `
  
  You are a BRS document editor. 
  You receive change requests and the current document content. 
  You must implement only the requested changes while preserving all existing content unless explicitly asked to modify it. 
  Each screen must maintain the format: 
  H2 heading (numbered), 
  optional description, diagram section, 
  and extra data section.  

  you should be expected to think beyond what you were asked to do. For example, if you are asked to create a one screen library management system only tracking books using crud for storage, you needs to think deeply and step by step. Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, it should be extremely specific and assume details it doesn't know. in the module example, it should explain how the module processes user input and how it displays output, plans for the ui, for example in the read books module it suggests a plan "
1. The user would be required to input the name of the book they are querying
2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
4. The system should validate the input to ensure the book name exists in the database.
5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
6. The retrieved details are displayed in a user-friendly format on the UI.
7. If the book name is not found, the system should display an appropriate error message to the user.
8. The UI should provide an option to go back to the main menu or perform another search.
". Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core.

For your reference, this is the current document content:
"${file_contents.data}"

Please update the document following these requirements:
1. Keep the existing document structure
2. Only make changes specified in the overview
3. Maintain all existing content unless explicitly asked to change/remove it
4. Return the complete updated document

Extra Important things to follow:
5. Do not prefix any part of the BRS with a heading (Example: DO NOT PUT DESCRIPTION OR TITLE BEFORE THE TEXT)
6. Diagrams are code blocks containing JSON "{"brsDiagram": {}" Do not modify this blank diagram template. `;

  const prompt = `
Hello, please make these changes:
${overview}
`;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: [
            {
              text: Sysprompt,
              type: "text",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "version_response",
          schema: {
            type: "object",
            required: ["newVersion"],
            properties: {
              newVersion: {
                type: "string",
                description:
                  "Updated version of the document with changes the user requested implemented",
              },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    // just publish a new version
    const messageContent = response.choices[0].message.content;
    if (messageContent === null) {
      throw new Error("Response message content is null");
    }

    console.log(response);

    const content = JSON.parse(messageContent);

    // put the new version number in a constant, just the integer

    const publishNewVersion = await fetch(
      "http://localhost:3000/api/legacy/data/publishNewVersion",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_name, data: content.newVersion }),
      }
    );
    const publishNewVersionResponse = await publishNewVersion.json();

    const latestVersion = publishNewVersionResponse.latestVersion;

    return Response.json({
      code: 200,
      message: "Successfully updated the document",
      latestVersion,
    });
  } catch (error) {
    return Response.json({ code: 500, message: error });
  }
}