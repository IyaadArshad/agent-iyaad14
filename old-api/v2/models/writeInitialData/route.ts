import OpenAI from "openai";
import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface FetchIdResponse {
  id: string;
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    if (!body.file_name || !body.user_inputs) {
      return Response.json({
        code: 400,
        success: false,
        message: "file_name and user_inputs are required",
      });
    }
  } catch (error) {
    return Response.json({ code: 400, message: "Invalid JSON payload" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      code: 500,
      message: "Misconfigured OpenAI environment variable in backend",
    });
  }

  const user_inputs = body.user_inputs;
  const file_name = body.file_name;

  console.log("PARAM USER INPUTS", user_inputs);
  console.log("PARAM FILENAME", file_name);

  async function FetchId(file_name: string): Promise<Response> {
    try {
      const record: FetchIdResponse = await pb
        .collection("files")
        .getFirstListItem(`file_name='${file_name}'`, { fields: "id" });
      return Response.json({ code: 200, message: "success", id: record.id });
    } catch (error) {
      return Response.json({ code: 404, message: "notfound" });
    }
  }

  const fetchIdResponse = await FetchId(file_name);
  const fetchIdData = await fetchIdResponse.json();

  if (fetchIdData.code === 404) {
    return Response.json({
      success: false,
      message: "File not found",
    });
  }

  const id = fetchIdData.id;
  const existingRecord = await pb.collection("files").getOne(id);
  const recordData = existingRecord.data || {};

  if (recordData.latestVersion && recordData.latestVersion > 0) {
    return Response.json({
      success: "false",
      message: `**${file_name}** is already initialized, please use implement_edits to create a new version`,
      systemMessage: `File already has some versions. Use implement_edits instead.`,
      file_name,
    });
  }

  const Sysprompt =
    `You are a BRS document writer. You are part of a function. Your role is to take user input, and write the initial data for a BRS file. Creating a Business Requirements Specification (BRS) document in markdown can be done using a document title at the beginning. Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple paragraph explaining the screen. You may use bold text, italics, bullet points or other visual aids to accompany this paragraph in this second section. It needs to be a brief overview. Use simple language that gets the point across without being unprofessional. The third section is the diagram. If this is a UI based function, then you add a diagram with a json markdown code block containing json {"brsDiagram": {}} The fourth and last section of every screen is the extra data. This is the last section, but it the main part of the screen information. It contains all the details and specifications, you must break down, decompose, and fully explain everything that the screen does, including explaining individual functions, adding tables or bullet points to specify data types, validation, inputs etc. You will also break it down fully for each module, each screen has modules and each models must have a properly explained inputs, processes, and outputs. There will always be some for of a short 1-2  sentence description in 1 or 2 lines too.  This could be adding a table for some sample data, tables to specify form field types, bullet points for extra info, etc. If sample data is there, make sure it is at least 7 rows.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this. You will not use bullet points to display lists with only 1 item, they should never feel empty. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. EXTEMELY IMPORTANT: You should be expected to think beyond what you were asked to do. You must assume and think hard about what the users requirements are, what the user implicitly might want too and add it in. Be detailed about it. For example, if you are asked to "create a one screen library management system only tracking books using crud for storage". Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, etc. each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, you should be extremely specific and assume details you doesn't know. in the module example for example, you should explain how the module processes user input and how it displays output and, plans for the ui, for example in the read books module it suggests a plan for example you could add "
1. The user would be required to input the name of the book they are querying
2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
4. The system should validate the input to ensure the book name exists in the database.
5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
6. The retrieved details are displayed in a user-friendly format on the UI.
7. If the book name is not found, the system should display an appropriate error message to the user.
8. The UI should provide an option to go back to the main menu or perform another search.
` +
    `Understand this example and think hard about the kind of BRS quality I expect. Know that this is an example and it is different depending on each users requests, but understand what I mean by you should go the extra mile to be specific. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table where you think it will look good. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core. Make sure a BRS never looks empty to anyone.`;

  let response;

  const Usrprompt = `Hello. Write initial data to file **${file_name}** using the following user request "${user_inputs}"`;
  try {
    response = await openai.chat.completions.create({
      model: "o4-mini",
      reasoning_effort: "high",
      messages: [
        {
          role: "developer",
          content: [
            {
              text: Sysprompt,
              type: "text",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: user_inputs }],
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
                  "The complete markdown content for the BRS document based on the user's requirements. Include all sections, headings, and details as described in the system prompt.",
              },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });
  } catch (error) {
    return Response.json({ code: 500, message: error });
  }

  try {
    recordData.latestVersion = 1;
    const data = response.choices[0].message.content;

    // Parse the JSON to extract just the markdown content
    let markdownContent;
    try {
      if (data === null) {
        throw new Error("Received null data from OpenAI response");
      }
      const parsedData = JSON.parse(data);
      markdownContent = parsedData.newVersion;

      if (!markdownContent) {
        throw new Error("No markdown content found in the response");
      }
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      return Response.json({
        success: false,
        message: "Failed to parse the document content",
        error: (parseError as Error).message,
      });
    }

    // Store only the markdown content in the versions
    recordData.versions = { 1: markdownContent };

    await pb.collection("files").update(id, {
      file_name,
      data: recordData,
    });

    return Response.json({
      success: "true",
      message: `**${file_name}** has been successfully initialized`,
      content: markdownContent, // Return the markdown content (not the JSON wrapper)
      systemMessage: `The first version is now v1. Use implement_edits to publish subsequent versions.`,
      file_name,
    });
  } catch (error) {
    return Response.json({ code: 500, message: error });
  }
}