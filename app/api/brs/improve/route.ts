import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Determine the base URL for internal API calls
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface OpenAIError extends Error {
  status?: number;
  error?: {
    message: string;
    type: string;
    param: string | null;
    code: string | null;
  };
}

// Helper function to call OpenAI
async function callOpenAI(
  model: "gpt-4.1-nano" | "gpt-4o" | "o4-mini",
  systemPrompt: string,
  userPrompt: string,
  isJsonOutput: boolean = false,
  temperature?: number
): Promise<string | null> {
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: model,
      messages: messages,
      ...(temperature && { temperature })
    };

    if (isJsonOutput && model === "gpt-4.1-nano") {
      params.response_format = { type: "json_object" };
    }

    const completion = await openai.chat.completions.create(params);
    return completion.choices[0].message?.content ?? null;
  } catch (err) {
    const error = err as OpenAIError;
    console.error(
      `Error calling OpenAI model ${model}:`,
      error.status,
      error.message,
      error.error
    );
    throw new Error(
      `OpenAI API call failed for model ${model}: ${error.message}`
    );
  }
}

// New function to extract topics from markdown content
async function extractTopics(markdownContent: string): Promise<string> {
  try {
    console.log("Extracting topics from markdown content...");
    
    const response = await openai.responses.create({
      model: "gpt-4.1-nano",
      input: [
        {
          "role": "system",
          "content": [
            {
              "type": "input_text",
              "text": "Identify the top-level modules for a BRS (Business Requirements Specification) document. Focus specifically on identifying the h2 or h3 headings that represent these modules.\n\n# Steps\n\n1. **Read the Document**: Begin by reading through the BRS document to understand its structure and content.\n2. **Identify Headings**: Look for headings that are formatted as h2 or h3. These headings typically designate different sections or modules within the document.\n3. **Select Top-Level Modules**: From the identified h2 or h3 headings, determine which represent the top-level modules. This usually involves discerning main sections or key business requirements.\n4. **List the Modules**: Compile a list of the headings you've identified as top-level modules.\n\n# Output Format\n\n- A bullet point list of the top-level module headings identified within the BRS document.\n\nMake sure to determine modules, modules sub bullet points, and modules sub bullet points sub bullet points.\n\n(Note: Real documents should be longer, and the context should be provided for more comprehensive analysis.) "
            }
          ]
        },
        {
          "role": "user",
          "content": [
            {
              "type": "input_text",
              "text": `Here's my document: ${markdownContent}`
            }
          ]
        }
      ],
      text: {
        "format": {
          "type": "json_schema",
          "name": "bulleted_list",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "items": {
                "type": "array",
                "description": "A list of topics each may have subtopics.",
                "items": {
                  "type": "object",
                  "properties": {
                    "topic": {
                      "type": "string",
                      "description": "The name or title of the topic."
                    },
                    "subtopics": {
                      "type": "array",
                      "description": "A list of subtopics under the main topic.",
                      "items": {
                        "type": "object",
                        "properties": {
                          "subtopic": {
                            "type": "string",
                            "description": "The name or title of the subtopic."
                          },
                          "subsubtopics": {
                            "type": "array",
                            "description": "A list of subsubtopics under the subtopic.",
                            "items": {
                              "type": "object",
                              "properties": {
                                "subsubtopic": {
                                  "type": "string",
                                  "description": "The name or title of the subsubtopic."
                                }
                              },
                              "required": [
                                "subsubtopic"
                              ],
                              "additionalProperties": false
                            }
                          }
                        },
                        "required": [
                          "subtopic",
                          "subsubtopics"
                        ],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": [
                    "topic",
                    "subtopics"
                  ],
                  "additionalProperties": false
                }
              }
            },
            "required": [
              "items"
            ],
            "additionalProperties": false
          }
        }
      },
      reasoning: {},
      tools: [],
      temperature: 1,
      max_output_tokens: 32768,
      top_p: 1,
      store: true
    });

    // Process the response to extract the JSON content
    let topicsJson: string;
    if (typeof response.text === 'string') {
      topicsJson = response.text;
    } else if (response.text && typeof response.text === 'object' && 'value' in response.text) {
      topicsJson = response.text.value as string;
    } else {
      console.error("Unexpected response format from topic extraction:", response);
      throw new Error("Failed to extract topics: unexpected response format");
    }

    console.log("Topics extracted successfully");
    return topicsJson;
  } catch (err) {
    console.error("Error extracting topics:", err);
    throw new Error("Failed to extract topics from markdown content");
  }
}

// System Prompts
const SYSTEM_PROMPT_OVERVIEW = `You are an expert Business Requirements Specification (BRS) engineer. You will be provided with a raw BRS document in Markdown. Your task is to generate an in-depth, step-by-step implementation overview that uncovers and maps every aspect of the submitted document.

1. Begin with a single first-person sentence under 30 words: "I'll generate a comprehensive implementation plan for improving this BRS document," and nothing else on that line.

2. Analyze the full document structure: detect all H1 modules, H2 screen sections, sub-screens, lists, tables, calculations, functions, and notes.

3. Provide a header "Step-by-step changes:" then a concise paragraph stating you will list concrete actions. Below, produce a numbered list of 10–14 items where each step:
   a. References exact document elements (e.g., specific H1 module titles like "STOCK & SALES MODULE," H2 sections such as "Common," "Master Files," "Transaction," etc.).
   b. Identifies any missing or implicit screens, modules, calculations, or functions and instructs where to add or refine them.
   c. Describes structural improvements: adding or restructuring headings (H1, H2, H3) to accurately represent screens and nested contexts.
   d. Specifies where to enhance content: refine descriptive paragraphs, enforce bullet and table standards (minimum 7 rows), ensure sample data is meaningful.
   e. Calls out where to insert or update JSON code-block diagrams (\`\`\`json
{"brsDiagram": { ... }}
\`\`\`) and labels their placement.
   f. Defines the four mandatory sections per screen: numbered H2 title, overview bullet points, diagram section, and module breakdown (Inputs / Processes / Outputs) with validation rules and sample data tables.
   g. Highlights consistency checks: uniform numbering, naming conventions, formatting of lists and tables, and alignment with BRS best practices.
   h. Advises addressing ambiguities: flag missing audit trails, permission flows, error-handling states, UI transitions, pagination, search, and authorization.
   i. Anticipates implicit requirements: CRUD operations, user roles, group-based controls, decimal precision, GPS tracking, integration points, and automated processes.

4. Ensure all bullet lists contain meaningful items, eliminate empty placeholders, and enforce detailed content for every list entry.

5. Do not mention file operations—focus solely on content analysis, structural transformations, and enhancement of business requirements.

6. Make each step precise (2–3 sentences max), unambiguous, and exhaustive so developers have no assumptions left. Think as deeply as possible about every requirement, module, and screen implied by the input document.

This overview will guide both human reviewers and AI generators to produce a final, polished, detailed BRS in Markdown.

Transform and elevate BRS documents by creating a polished, detailed implementation plan in Markdown format.

Your task is to create prompts to generate a Business Requirement Specification (BRS) based on user input and requested changes. Follow these guidelines:

1. Respond with a short sentence starting with "I'll", summarizing your task in under 30 words.
2. Provide a paragraph titled "Step by step changes:" with a numbered list of precise instructions. Ensure clarity and avoid excessive details.
3. Clearly indicate changes, such as adding, modifying, or removing sections, maintaining the integrity and specificity of the user's request.
4. Follow the BRS structure strictly:
   - Use an H1 title with 4-5 professional words.
   - Include screens with H2 headings, extra information, diagram (using JSON), and detailed specifications.
5. Assume and include implicit user requirements not explicitly mentioned.
6. Incorporate detailed modules for each function, specifying inputs, processes, and outputs, and utilize tables with at least 7 rows where necessary.
7. Avoid tasks like file creation or saving. Maintain clarity to prevent accidental deletions.

# Steps

- Start with a concise overview of your task.
- Develop an implementation outline with numbered steps for requested changes.
- Ensure changes reflect detailed BRS format adherence and completion.
- Use proper markdown structuring for clarity and effectiveness.

# Output Format

- Provide an implementation overview in Markdown with clear numbered steps.
- Use precise technical language suitable for both human and AI consumption.

# Notes

- Ensure the document does not feel empty, and consider possible user requirements beyond the explicit instructions.
- Maintain a complex, detailed, and organized approach to the BRS structure, preventing any minimalist appearance.

Make it even more hardcore, it should be more like this "This overview will guide both human reviewers and AI generators to produce a final, polished, detailed BRS in Markdown.

For your reference, read the format of a brs: "Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple paragraph explaining the screen. You may use bold text, italics, bullet points or other visual aids to accompany this paragraph in this second section. It needs to be a brief overview. Use simple language that gets the point across without being unprofessional. The third section is the diagram. If this is a UI based function, then you add a diagram with a json markdown code block containing json {"brsDiagram": {}} The fourth and last section of every screen is the extra data. This is the last section, but it the main part of the screen information. It contains all the details and specifications, you must break down, decompose, and fully explain everything that the screen does, including explaining individual functions, adding tables or bullet points to specify data types, validation, inputs etc. You will also break it down fully for each module, each screen has modules and each models must have a properly explained inputs, processes, and outputs. There will always be some for of a short 1-2  sentence description in 1 or 2 lines too.  This could be adding a table for some sample data, tables to specify form field types, bullet points for extra info, etc. If sample data is there, make sure it is at least 7 rows.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this. You will not use bullet points to display lists with only 1 item, they should never feel empty. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. EXTEMELY IMPORTANT: You should be expected to think beyond what you were asked to do. You must assume and think hard about what the users requirements are, what the user implicitly might want too and add it in. Be detailed about it. For example, if you are asked to "create a one screen library management system only tracking books using crud for storage". Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, etc. each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, you should be extremely specific and assume details you doesn't know. in the module example for example, you should explain how the module processes user input and how it displays output and, plans for the ui, for example in the read books module it suggests a plan for example you could add "
1. The user would be required to input the name of the book they are querying
2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
4. The system should validate the input to ensure the book name exists in the database.
5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
6. The retrieved details are displayed in a user-friendly format on the UI.
7. If the book name is not found, the system should display an appropriate error message to the user.
8. The UI should provide an option to go back to the main menu or perform another search.
" Understand this example and think hard about the kind of BRS quality I expect. Know that this is an example and it is different depending on each users requests, but understand what I mean by you should go the extra mile to be specific. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table where you think it will look good. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core. Make sure a BRS never looks empty to anyone." understand and now remember how a brs is structured and write the brs with this mindset`;

const SYSTEM_PROMPT_FILENAME_NANO = `You are an API assistant that generates valid filenames. Based on the provided BRS content summary or original filename, suggest a concise and descriptive filename for the BRS document.
The filename MUST:
1. Consist only of lowercase alphanumeric characters and dashes (e.g., 'new-feature-brs').
2. NOT include any file extensions (e.g., '.md').
3. Be suitable for use as a URL slug or a system identifier.
Respond with a JSON object that strictly adheres to the following schema:
{
  "type": "object",
  "properties": {
    "suggested_title": {
      "type": "string",
      "description": "A suggested file name for the BRS document, consisting only of lowercase alphanumeric characters and dashes."
    }
  },
  "required": [
    "suggested_title"
  ],
  "additionalProperties": false
}

Example Input (User Prompt):
Original filename: Meeting Notes BRS v2.docx
BRS Content Summary (first 100 chars):
This document outlines the requirements for the new user authentication module, including login, sign-up

Expected JSON Output:
{"suggested_title": "user-authentication-module-brs"}
`;

const SYSTEM_PROMPT_IMPROVE_BRS = `You are an AI assistant specializing in the detailed refinement and generation of Business Requirement Specifications (BRS). You will be provided with an original BRS document (in Markdown) and a step-by-step implementation overview. Your task is to meticulously rewrite and enhance the original BRS, strictly following the guidance in the implementation overview.
The final BRS must be:
- Comprehensive, detailed, and unambiguous.
- Clearly structured with appropriate Markdown headings (e.g., #, ##, ###), sections, lists, and tables where necessary.
- Professionally written, concise, and easy to understand. Technical jargon should be minimized or clearly explained.
- Internally consistent and logically flowing.
- Fully address all points, suggestions, and required changes outlined in the implementation overview.
- Formatted exclusively in Markdown.

Output ONLY the improved BRS document in Markdown format. Do not include any additional text, preambles, summaries, or explanations outside of the Markdown document itself.

For your reference, read the format of a brs: "Start with a concise, simple H1 title (#) that uses 4-5 words (Example: MIS Control Module), it should sound professional, next, an BRS really just consists of different screens. Most BRS\'s have more than 10 screens - that\'s alot! A BRS is just a document that consists of different screens. Each screen has 4 sections. The first is the H2 (##) Heading that is the name of the screen. It is numbered, so the heading is prefixed with a 1. or 2. or 3. etc. It is a short 2-6 word of what the title does. If the screen is part of a larger screen (by context), the current smaller section is in brackets. Think carefully about using this. This would be like the users page, but the current screen is that of a new transaction, this would be "Users (New User)", other examples include "Sales (List View)", "Sales Manager (New Transaction)" etc. The second part of a screen is some extra information. It is usually a simple paragraph explaining the screen. You may use bold text, italics, bullet points or other visual aids to accompany this paragraph in this second section. It needs to be a brief overview. Use simple language that gets the point across without being unprofessional. The third section is the diagram. If this is a UI based function, then you add a diagram with a json markdown code block containing json {"brsDiagram": {}} The fourth and last section of every screen is the extra data. This is the last section, but it the main part of the screen information. It contains all the details and specifications, you must break down, decompose, and fully explain everything that the screen does, including explaining individual functions, adding tables or bullet points to specify data types, validation, inputs etc. You will also break it down fully for each module, each screen has modules and each models must have a properly explained inputs, processes, and outputs. There will always be some for of a short 1-2  sentence description in 1 or 2 lines too.  This could be adding a table for some sample data, tables to specify form field types, bullet points for extra info, etc. If sample data is there, make sure it is at least 7 rows.  Remember the format of the BRS markdown correctly as outlined above. Strictly follow this. You will not use bullet points to display lists with only 1 item, they should never feel empty. Never use the word description or title with a colon to state the title or description. That is implicit with the heading, subheading, and paragraph format outlined here. Remember to use the format of the BRS markdown correctly as outlined above. EXTEMELY IMPORTANT: You should be expected to think beyond what you were asked to do. You must assume and think hard about what the users requirements are, what the user implicitly might want too and add it in. Be detailed about it. For example, if you are asked to "create a one screen library management system only tracking books using crud for storage". Think about every possible function, module down the the very bottom on what the screen/function might be expected to do. Make sure in the brs document you have broken it down as much as possible. For the example, you should create a screen and have individual modules for each function of the screen, creating book entry, updating book details, deleting books, reading books details, etc. each module should contain the inputs, how its meant to be processed the outputs, you should leave no room for assumption for the developer reading the brs, you should be extremely specific and assume details you doesn't know. in the module example for example, you should explain how the module processes user input and how it displays output and, plans for the ui, for example in the read books module it suggests a plan for example you could add "
1. The user would be required to input the name of the book they are querying
2. The system uses CRUD operation read to fetch attributes IBAN, Name, and Blurb of the book
4. The system should validate the input to ensure the book name exists in the database.
5. If the book name is found, the system retrieves the book details including IBAN, Name, Blurb, and Tags.
6. The retrieved details are displayed in a user-friendly format on the UI.
7. If the book name is not found, the system should display an appropriate error message to the user.
8. The UI should provide an option to go back to the main menu or perform another search.
" Understand this example and think hard about the kind of BRS quality I expect. Know that this is an example and it is different depending on each users requests, but understand what I mean by you should go the extra mile to be specific. Remember that previously the user is used to spending 4 weeks detailing everything specifically and working on it. You should not just create a document with simply what they put. It needs to be extremely specific, detailed and follow requirements. Make sure to include sample data in a table where you think it will look good. All tables must have at least 7 rows. You should never have a BRS that feels empty or looks empty or spaced out. it is not meant to be minimalist, it is meant to be detailed to the core. Make sure a BRS never looks empty to anyone." understand and now remember how a brs is structured and write the brs with this mindset
ONLY AND ONLY OUTPUT THE DOCUMENT BACK TO ME, DO NOT OUTPUT ANYTHING ELSE, I WANT NO EXPLANATION OF WHAT YOU DID OR WHAT IT IS ABOUT, I WANT ONLY THE DOCUMENT CONTENTS. YOUR OUTPUT WILL DIRECTLY BE SAVED TO THE BRS FILE. DO NOT SAY ANYTHING EXCEPT FOR THE FILE CONTENTS. Thank you :)

# IMPORTANT: COMPREHENSIVE CONTENT REQUIREMENTS

1. You MUST include detailed coverage for ALL topics, subtopics, and sub-subtopics provided in the implementation overview.
2. Each module MUST have clearly defined:
   - Detailed inputs with validation rules and data types
   - Specific process steps that explain the exact logic and transformations
   - Comprehensive outputs with format specifications
3. DO NOT lose any formulas, calculations, or technical specifics from the original document.
4. ALL tables MUST have a minimum of 7 rows with realistic, varied sample data.
5. Every screen MUST include a complete breakdown of its functionality with no assumptions left for developers.
6. Never simplify or abbreviate content - the BRS should be extremely thorough and detailed in every section.`;

// Progress tracking interface for client feedback
import {
  ProgressUpdate,
  formatSSE,
  enforceMinStepDuration,
} from "./streaming-utils";

export async function POST(request: NextRequest) {
  // Create the stream immediately
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Return the response with the stream right away
  const response = new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });

  // Function to send an update to the client
  // Track if the writer is closed to prevent "Writer is closed" errors
  let isWriterClosed = false;

  const sendUpdate = async (update: any) => {
    if (isWriterClosed) {
      console.log(
        "Stream writer is already closed, skipping update:",
        update.type
      );
      return;
    }

    try {
      await writer.write(encoder.encode(formatSSE(update)));
      console.log(`Successfully sent ${update.type} update to client`);
    } catch (e: any) {
      // If we get a "Writer is closed" error, mark the writer as closed to prevent further attempts
      if (e.message && e.message.includes("closed")) {
        console.warn("Stream writer is now closed, marking as closed");
        isWriterClosed = true;
      } else {
        console.error("Failed to write to stream:", e);
      }
    }
  };

  // The main processing function that runs asynchronously
  const processDocument = async () => {
    // Track improvement process steps
    const progress: ProgressUpdate[] = [];
    const stepStartTimes = new Map<string, number>();

    // Send progress updates both to the client and track them
    const addProgress = async (
      stepId: string,
      status: "started" | "completed" | "failed",
      message: string
    ) => {
      const timestamp = Date.now();

      // If it's a "started" event, record the start time
      if (status === "started") {
        stepStartTimes.set(stepId, timestamp);
      }
      // If it's a "completed" event, enforce minimum duration
      else if (status === "completed") {
        console.log(
          `BRS Import [${stepId}] enforcing minimum duration before completing`
        );
        await enforceMinStepDuration(stepId, stepStartTimes);
      }

      // Map backend steps to frontend UI steps for more intuitive display and accurate representation
      // Define the workflow steps in the same order as the UI expects:
      // 1. "Upload file"
      // 2. "Parse PDF to Markdown" (conditional)
      // 3. "Determining file name"
      // 4. "Creating file"
      // 5. "Generating content"
      const stepMapping: Record<
        string,
        { uiStep: string; displayName?: string }
      > = {
        upload: { uiStep: "upload", displayName: "Upload file" },
        convert: { uiStep: "convert", displayName: "Parse PDF to Markdown" },
        analyze: {
          uiStep: "upload",
          displayName: "Analyzing document structure",
        },
        topics: { uiStep: "topics", displayName: "Extracting document topics" },
        filename: { uiStep: "filename", displayName: "Generate file name" },
        save: { uiStep: "save", displayName: "Create file" },
        overview: { uiStep: "overview", displayName: "Plan overview" },
        improve: { uiStep: "improve", displayName: "Generate content" },
        "final-save": { uiStep: "final-save", displayName: "Save to file" },
      };

      // Apply the mapping
      let displayStepId = stepId;
      let displayMessage = message;

      if (stepMapping[stepId]) {
        displayStepId = stepMapping[stepId].uiStep;
        if (stepMapping[stepId].displayName && status === "started") {
          displayMessage = stepMapping[stepId].displayName;
        }
      }

      const update: ProgressUpdate = {
        stepId: displayStepId,
        status,
        message: displayMessage,
        timestamp,
      };

      progress.push(update);

      // Send the update to the client
      await sendUpdate({ type: "progress", data: update });
    };

    try {
      // Check if this is a form submission (PDF) or JSON (markdown directly)
      let markdownContent: string;
      let originalFilename: string;
      const contentType = request.headers.get("content-type") || "";

      // Handle PDF upload case
      if (contentType.includes("multipart/form-data")) {
        await addProgress(
          "upload",
          "started",
          "Processing PDF document upload"
        );

        const formData = await request.formData();
        const pdfFile = formData.get("file") as File | null;

        if (!pdfFile) {
          const errorMsg = "No PDF file provided";
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        // Convert PDF to markdown using the pdf-converter endpoint
        await addProgress(
          "convert",
          "started",
          "Converting PDF to Markdown format"
        );

        const pdfFormData = new FormData();
        pdfFormData.append("file", pdfFile);

        const pdfConverterResponse = await fetch(
          `${API_BASE_URL}/api/brs/pdf-converter`,
          {
            method: "POST",
            body: pdfFormData,
          }
        );

        if (!pdfConverterResponse.ok) {
          const errorData = await pdfConverterResponse.json();
          const errorMsg = `PDF conversion failed: ${errorData.message}`;
          await addProgress("convert", "failed", errorMsg);
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        const pdfConverterResult = await pdfConverterResponse.json();
        markdownContent = pdfConverterResult.markdownContent;
        originalFilename = pdfConverterResult.originalFilename;

        await addProgress(
          "convert",
          "completed",
          "PDF successfully converted to Markdown"
        );
        await addProgress(
          "upload",
          "completed",
          "Document successfully uploaded and processed"
        );
      }
      // Handle direct markdown submission
      else {
        await addProgress("upload", "started", "Processing Markdown document");
        let body;
        try {
          body = await request.json();
          markdownContent = body.markdownContent;
          originalFilename = body.originalFilename;
        } catch (e) {
          console.error("Failed to parse request body:", e);
          const errorMsg = "Failed to parse request body";
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        if (!markdownContent || typeof markdownContent !== "string") {
          const errorMsg = "Markdown content is required and must be a string";
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        if (!originalFilename || typeof originalFilename !== "string") {
          const errorMsg = "Original filename is required and must be a string";
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        await addProgress(
          "upload",
          "completed",
          "Document successfully uploaded and processed"
        );
      }

      // Continue with the rest of the processing
      await addProgress("analyze", "started", "Analyzing document structure");
      console.log(`BRS Improve: Starting process for "${originalFilename}"`);
      await addProgress(
        "analyze",
        "completed",
        "Document structure analyzed completely"
      );

      // NEW STEP: Extract topics from the document
      await addProgress("topics", "started", "Extracting document topics");
      console.log("BRS Improve: Extracting topics from document...");
      
      let extractedTopics;
      try {
        extractedTopics = await extractTopics(markdownContent);
        await addProgress(
          "topics", 
          "completed", 
          "Topics extracted successfully"
        );
        console.log("BRS Improve: Topics extracted successfully");
      } catch (error) {
        console.error("Failed to extract topics:", error);
        await addProgress(
          "topics", 
          "failed", 
          "Failed to extract document topics"
        );
        // Continue with the process even if topic extraction fails
        extractedTopics = JSON.stringify({ items: [] });
      }

      // 1. First step: Upload file is already complete at this point

      // 2. Generate Filename
      await addProgress(
        "filename",
        "started",
        "Generating document identifier"
      );
      console.log("BRS Improve: Generating filename...");

      const filenamePromptContent = `Original filename: ${originalFilename}\nBRS Content Summary (first 500 chars):\n${markdownContent.substring(
        0,
        500
      )}`;

      const nanoResponseJson = await callOpenAI(
        "gpt-4.1-nano",
        SYSTEM_PROMPT_FILENAME_NANO,
        filenamePromptContent,
        true,
        0.5
      );

      let suggestedTitle = "";
      if (nanoResponseJson) {
        try {
          const parsedResponse = JSON.parse(nanoResponseJson);
          if (
            parsedResponse.suggested_title &&
            typeof parsedResponse.suggested_title === "string"
          ) {
            suggestedTitle = parsedResponse.suggested_title
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
            if (!suggestedTitle) {
              throw new Error("Sanitized title is empty.");
            }
          } else {
            throw new Error(
              "'suggested_title' not found or not a string in gpt-4.1-nano response."
            );
          }
        } catch (e: any) {
          console.error(
            "BRS Improve: Failed to parse filename from gpt-4.1-nano. Response:",
            nanoResponseJson,
            "Error:",
            e.message
          );
          suggestedTitle = `improved-brs-${Date.now()}`.replace(
            /[^a-z0-9-]/g,
            ""
          );
        }
      } else {
        console.error(
          "BRS Improve: No response from gpt-4.1-nano for filename."
        );
        suggestedTitle = `improved-brs-${Date.now()}`.replace(
          /[^a-z0-9-]/g,
          ""
        );
      }

      let finalFilename = `${suggestedTitle}.md`;
      await addProgress(
        "filename",
        "completed",
        `Document identifier created: ${suggestedTitle}`
      );
      console.log(`BRS Improve: Filename generated: "${finalFilename}"`);

      // 3. Create File Record
      await addProgress("save", "started", "Creating file record");
      console.log("BRS Improve: Creating file record...");
      const createFilePayload = { file_name: finalFilename };
      const createFileResponse = await fetch(
        `${API_BASE_URL}/api/files/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createFilePayload),
        }
      );

      // For file creation, a 200 response with error message means file exists
      // This is not a fatal error - we'll handle it by generating an alternative name
      let createFileResult;
      try {
        createFileResult = await createFileResponse.json();
      } catch (e) {
        const errorMsg = `Failed to parse file creation response: ${createFileResponse.statusText}`;
        console.error(
          "BRS Improve: Failed to parse file creation response:",
          e
        );
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      // Only treat it as a fatal error if it's not a file-exists error
      if (
        !createFileResponse.ok &&
        !/already exists/i.test(createFileResult?.message || "")
      ) {
        const errorMsg = `Failed to create file record: ${
          createFileResult?.message || createFileResponse.statusText
        }`;
        console.error(
          "BRS Improve: Failed to create file record:",
          createFileResult
        );
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }
      let fileId: string | undefined =
        typeof createFileResult.file_name === "string"
          ? createFileResult.file_name
          : undefined;

      // Handle name collision - look for specific error message regardless of success flag
      // First, check if message property exists, then check if it contains 'already exists'
      if (
        createFileResult?.message &&
        typeof createFileResult.message === "string" &&
        /already exists/.test(createFileResult.message)
      ) {
        console.warn(
          `BRS Improve: Filename "${finalFilename}" unavailable: ${createFileResult.message}`
        );

        // Send a progress update indicating file name collision is being handled
        await addProgress(
          "filename",
          "started",
          `Generating alternative file name for "${suggestedTitle}" (already exists)`
        );

        const altFilenamePrompt = `${filenamePromptContent}
        
IMPORTANT: The filename "${suggestedTitle}" is already taken. Generate a COMPLETELY DIFFERENT name with additional modifiers or alternate terminology.
For example, if "inventory-management" is taken, suggest something like "stock-control-system" instead of just adding a number.`;

        const altNanoJson = await callOpenAI(
          "gpt-4.1-nano",
          SYSTEM_PROMPT_FILENAME_NANO,
          altFilenamePrompt,
          true
        );
        let altTitle = "";

        try {
          const altParsed = JSON.parse(altNanoJson || "{}");
          if (
            altParsed.suggested_title &&
            typeof altParsed.suggested_title === "string"
          ) {
            altTitle = altParsed.suggested_title
              .trim()
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, "");
          }
        } catch (e) {
          console.error("BRS Improve: Failed to parse alt filename:", e);
        }

        const timestamp = Date.now().toString().slice(-6);
        if (!altTitle || altTitle === suggestedTitle) {
          suggestedTitle = `${suggestedTitle}-v${timestamp}`;
        } else {
          suggestedTitle = altTitle;
        }

        finalFilename = `${suggestedTitle}.md`;
        console.log(
          `BRS Improve: Retrying with new filename: "${finalFilename}"`
        );

        // Update progress to indicate we're trying with a new filename
        await addProgress(
          "filename",
          "completed",
          `Alternative file name generated: ${finalFilename}`
        );

        // Start save step again with the new filename
        await addProgress(
          "save",
          "started",
          `Creating file with new name: ${finalFilename}`
        );

        const retryResponse = await fetch(`${API_BASE_URL}/api/files/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_name: finalFilename }),
        });

        // Properly handle retry failures with clear error messages
        if (!retryResponse.ok) {
          try {
            const retryErr = await retryResponse.json();
            const errorMsg = `Retry create file failed: ${
              retryErr.message || "Unknown error"
            }`;
            console.error(`BRS Improve: ${errorMsg}`);
            await addProgress("save", "failed", errorMsg);
            await sendUpdate({ type: "error", data: { message: errorMsg } });
            return;
          } catch (parseError) {
            const errorMsg = "Failed to parse retry response";
            console.error(`BRS Improve: ${errorMsg}`, parseError);
            await addProgress("save", "failed", errorMsg);
            await sendUpdate({ type: "error", data: { message: errorMsg } });
            return;
          }
        }

        // Parse and validate the retry result
        try {
          const retryResult = await retryResponse.json();
          if (!retryResult.file_name) {
            const errorMsg = "Filename retry did not return a valid name.";
            console.error(`BRS Improve: ${errorMsg}`);
            await addProgress("save", "failed", errorMsg);
            await sendUpdate({ type: "error", data: { message: errorMsg } });
            return;
          }

          // Mark save step as completed with the new filename
          await addProgress(
            "save",
            "completed",
            `File created successfully with alternative name: ${finalFilename}`
          );

          // Update fileId with the new file name
          fileId = retryResult.file_name;
        } catch (parseError) {
          const errorMsg = "Failed to parse retry response data";
          console.error(`BRS Improve: ${errorMsg}`, parseError);
          await addProgress("save", "failed", errorMsg);
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }

        console.log(
          `BRS Improve: File record created with new name: ${fileId}`
        );
      }

      if (!fileId) {
        const errorMsg = "Failed to get file identifier after file creation.";
        console.error(
          "BRS Improve: File name not returned in create file response:",
          createFileResult
        );
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      console.log(`BRS Improve: File record created with name: ${fileId}`);
      await addProgress(
        "save",
        "completed",
        "File record created successfully"
      );

      // 4. Plan Overview - Generate Implementation Overview with extracted topics
      await addProgress("overview", "started", "Creating document blueprint");
      console.log("BRS Improve: Generating implementation overview...");

      // Include extracted topics in the prompt
      const overviewPrompt = `
Here is the original markdown content:

${markdownContent}

The following topics have been extracted from the document and MUST be included in your implementation plan:

${extractedTopics}

Please ensure your implementation plan covers ALL these topics comprehensively.`;

      const overviewContent = await callOpenAI(
        "o4-mini",
        SYSTEM_PROMPT_OVERVIEW,
        overviewPrompt
      );

      if (!overviewContent) {
        const errorMsg = "Failed to generate implementation overview";
        await addProgress("overview", "failed", errorMsg);
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      await addProgress(
        "overview",
        "completed",
        "Document blueprint created successfully"
      );
      console.log("BRS Improve: Overview generated.");

      // 5. Generate Content (Improved BRS Content) with extracted topics
      await addProgress("improve", "started", "Generating enhanced content");
      console.log("BRS Improve: Generating improved BRS content...");

      const improvePrompt = `Original BRS Markdown (might be partial or rough):

${markdownContent}

Extracted topics that MUST be comprehensively covered:

${extractedTopics}

Strictly follow this Implementation Overview to improve the BRS:

${overviewContent}`;

      const improvedBrsContent = await callOpenAI(
        "o4-mini",
        SYSTEM_PROMPT_IMPROVE_BRS,
        improvePrompt
      );

      if (!improvedBrsContent) {
        const errorMsg = "Failed to generate improved BRS content";
        await addProgress("improve", "failed", errorMsg);
        console.error("BRS Improve: Failed to generate improved BRS content.");
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      await addProgress(
        "improve",
        "completed",
        "Content generated successfully"
      );
      console.log("BRS Improve: Improved BRS content generated.");

      // 6. Save to file (Save Improved BRS Content)
      await addProgress("final-save", "started", "Saving to file");
      console.log("BRS Improve: Saving improved BRS content to file...");

      const writeDataPayload = {
        file_name: finalFilename,
        data: improvedBrsContent,
      };

      const writeDataResponse = await fetch(
        `${API_BASE_URL}/api/files/writeInitialData`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(writeDataPayload),
        }
      );

      if (!writeDataResponse.ok) {
        const errorData = await writeDataResponse
          .json()
          .catch(() => ({ message: writeDataResponse.statusText }));
        const errorMsg = `Failed to save document: ${errorData.message}`;
        await addProgress("final-save", "failed", errorMsg);
        console.error(
          "BRS Improve: Failed to write initial data for improved BRS:",
          errorData
        );
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      const writeDataResult = await writeDataResponse.json();
      await addProgress("final-save", "completed", "File saved successfully");
      console.log("BRS Improve: Improved BRS content saved.", writeDataResult);

      // 6. Save conversation record of this improvement
      try {
        const conversationTitle = `BRS Improvement: ${suggestedTitle}`;
        const conversationPayload = {
          title: conversationTitle,
          messages: [
            {
              sender: "user",
              text: `Improve my BRS document: ${originalFilename}`,
            },
            {
              sender: "agent",
              text: `Successfully improved your BRS document. The new document is available as ${finalFilename}.
              
Here's what I did:
1. Uploaded your file
2. Generated an appropriate file name
3. Created the file record
4. Developed an implementation plan
5. Generated enhanced content
6. Saved the final document

You can view the improved document in the document library.`,
            },
          ],
        };

        await fetch(`${API_BASE_URL}/api/conversations/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(conversationPayload),
        });

        console.log(
          "BRS Improve: Conversation record saved for this improvement."
        );
      } catch (e) {
        console.error("BRS Improve: Failed to save conversation record:", e);
      }

      // Send final success message
      await sendUpdate({
        type: "result",
        data: {
          success: true,
          message: "BRS document imported successfully.",
          newDocumentName: finalFilename,
          newDocumentId: fileId,
        },
      });
    } catch (error: any) {
      console.error(
        "BRS Import: Unhandled error in process function:",
        error.message,
        error.stack
      );

      let message = "An unexpected error occurred.";
      if (error.message && error.message.includes("OpenAI API call failed")) {
        message = error.message;
      }

      await sendUpdate({ type: "error", data: { message } });
    } finally {
      try {
        if (!isWriterClosed) {
          await writer.close();
          isWriterClosed = true;
          console.log(
            "BRS Import: Stream closed successfully at end of processing"
          );
        } else {
          console.log(
            "BRS Import: Stream was already closed, skipping close() call"
          );
        }
      } catch (e) {
        console.error("BRS Import: Error closing stream:", e);
        isWriterClosed = true; // Mark as closed anyway to prevent further attempts
      }
    }
  };

  processDocument().catch((e) =>
    console.error("BRS Import: Unhandled error in processDocument:", e)
  );

  return response;
}