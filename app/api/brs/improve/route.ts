import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Determine the base URL for internal API calls
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

// New System Prompt for Module Extraction
const SYSTEM_PROMPT_EXTRACT_MODULES = `You are an assistant that analyzes BRS (Business Requirements Specification) documents in Markdown format.
Your task is to identify and list the main module titles from the provided document content.

GUIDELINES FOR MODULE IDENTIFICATION:
1. Modules are typically represented by top-level headings (H1 or very important H2 headings).
2. Focus on distinct functional areas or major sections of the BRS.
3. A module title typically describes a major system component, like "USER MANAGEMENT MODULE" or "INVENTORY CONTROL SYSTEM".
4. Headings that are clearly sub-sections or screens of another module should NOT be included.
5. Look for headings that group related functionality together.
6. Normalize module titles by removing numbering and standardizing capitalization.

Respond with a JSON object containing a single key "module_names", which is an array of strings.
Each string in the array should be a main module title found in the document.
If no clear modules are found, or the document is too short to identify distinct modules, return an empty array.

Example Input (User Prompt - part of the document content):
# Main BRS Title

## 1. User Management Module
...
## 2. Inventory Control System
...
### 2.1 Stock Intake
...
## 3. Reporting Dashboard
...

Expected JSON Output:
{"module_names": ["USER MANAGEMENT MODULE", "INVENTORY CONTROL SYSTEM", "REPORTING DASHBOARD"]}

Another Example Input (User Prompt - short document):
# Quick Idea
Just a brief note about a feature.

Expected JSON Output:
{"module_names": []}

Example with typical BRS structure:
# SALES MODULE
## 1. Sales Order Entry
## 2. Customer Management
# INVENTORY MODULE
## 1. Stock Management 
## 2. Warehouse Operations

Expected JSON Output:
{"module_names": ["SALES MODULE", "INVENTORY MODULE"]}
`;

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
  temperature?: number,
  max_tokens?: number
): Promise<string | null> {
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: model,
      messages: messages,
      ...(temperature !== undefined && { temperature }),
      ...(max_tokens !== undefined && { max_tokens }),
    };

    if (isJsonOutput && (model === "gpt-4.1-nano" || model === "gpt-4o")) {
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

// New helper function to get module names
async function getModuleNamesFromDocument(markdownContent: string): Promise<string[]> {
  console.log("BRS Improve: Identifying module names from document...");
  const userPrompt = `Document content:\n\n${markdownContent}`;
  try {
    // Using gpt-4.1-nano as it's good for structured JSON output and should be sufficient for this task.
    // If it struggles, o4-mini could be an alternative.
    const responseJson = await callOpenAI(
      "gpt-4.1-nano", 
      SYSTEM_PROMPT_EXTRACT_MODULES,
      userPrompt,
      true // Expect JSON output
    );

    if (responseJson) {
      const parsed = JSON.parse(responseJson);
      if (parsed.module_names && Array.isArray(parsed.module_names)) {
        console.log("BRS Improve: Module names identified:", parsed.module_names);
        return parsed.module_names.filter((name: any) => typeof name === 'string'); // Explicitly type 'name' as any or string
      }
    }
    console.warn("BRS Improve: Could not parse module names or 'module_names' array not found/valid.");
    return [];
  } catch (error) {
    console.error("BRS Improve: Error identifying module names:", error);
    return []; // Return empty array on error
  }
}

// Helper to convert slug to Title Case
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// System Prompts
const SYSTEM_PROMPT_OVERVIEW = `You are an expert Business Requirements Specification (BRS) engineer. You will be provided with a raw BRS document in Markdown. Your task is to generate an in-depth, step-by-step implementation overview that uncovers and maps every aspect of the submitted document for improvement.

1. Begin with a single first-person sentence under 30 words: "I'll generate a comprehensive implementation plan for improving this BRS document," and nothing else on that line.

2. Analyze the full document structure: 
   - Strictly identify main MODULES as H1 headers (e.g., "# USER MANAGEMENT MODULE")
   - Identify SCREENS as H2 headers (e.g., "## 1. User Registration Screen")
   - Clearly differentiate between modules (major system components) and screens (UI interfaces)
   - Map all sub-screens, lists, tables, calculations, functions, and notes

3. Provide a header "Step-by-step changes:" then a concise paragraph stating you will list concrete actions. Below, produce a numbered list of 10–14 items where each step:
   a. References exact document elements (e.g., specific H1 module titles like "STOCK & SALES MODULE," H2 sections such as "Common," "Master Files," "Transaction," etc.).
   b. Identifies any missing or implicit screens, modules, calculations, or functions and instructs where to add or refine them for a complete BRS.
   c. Describes structural improvements: 
      - Use H1 ONLY for main functional modules (e.g., "# USER MANAGEMENT MODULE")
      - Use H2 for screens with proper numbering (e.g., "## 1. User Registration Screen")
      - Use H3 for subsections within screens
      - NEVER use H1 for screens or H2 for modules - maintain proper hierarchy
   d. Specifies where to enhance content: 
      - Each paragraph must be detailed and specific (minimum 3-4 sentences)
      - All tables must use proper Markdown syntax with headers and separator rows
      - All tables must have minimum 7 rows of meaningful, varied, realistic sample data
      - No placeholder or generic content allowed
   e. Calls out where to insert or update JSON code-block diagrams (\`\`\`json\n{\"brsDiagram\": {"screenName": "Screen Title", "elements": []}}\n\`\`\`) and labels their placement clearly after each screen description.
   f. Defines the four mandatory sections per screen: 
      - Numbered H2 title with a clear, descriptive name
      - Overview paragraph (3-4 sentences minimum) explaining the screen's purpose and functionality
      - JSON diagram section immediately after overview
      - Detailed breakdown with three mandatory sections: 
        * **Inputs**: Table with Field, Type, Validation, Description, Sample Value
        * **Processes**: Numbered list of specific business logic steps (minimum 3)
        * **Outputs**: Description of data/UI produced with concrete examples
   g. Highlights consistency checks: uniform numbering, naming conventions, formatting of lists and tables, and alignment with BRS best practices throughout the entire document.
   h. Advises addressing ambiguities: flag missing audit trails, permission flows, error-handling states, UI transitions, pagination, search, and authorization mechanisms.
   i. Anticipates implicit requirements: CRUD operations, user roles, group-based controls, decimal precision, GPS tracking, integration points, and automated processes that a comprehensive BRS should cover.

4. Ensure all bullet lists contain meaningful items, eliminate empty placeholders, and enforce detailed content for every list entry.

5. Do not mention file operations—focus solely on content analysis, structural transformations, and enhancement of business requirements.

6. Make each step precise (2–3 sentences max), unambiguous, and exhaustive so developers have no assumptions left. Think as deeply as possible about every requirement, module, and screen implied by the input document to make it exceptionally detailed.

This overview will guide both human reviewers and AI generators to produce a final, polished, detailed BRS in Markdown format. Your plan should be "hardcore" in its thoroughness and expectation of detail, reflecting the need for a BRS that leaves no room for ambiguity. Assume the original document may be a rough draft and your plan is to elevate it to an exemplary BRS.
`;

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

// NEW System Prompt for Implementing Improvements
const SYSTEM_PROMPT_IMPLEMENT_IMPROVEMENTS = `You are a specialized BRS (Business Requirements Specification) document editor tasked with meticulously implementing an improvement plan for an existing BRS document.

Your objective:
1. You will receive the original BRS document content and a detailed improvement plan (overview).
2. You MUST implement ALL changes, enhancements, and structural adjustments outlined in the improvement plan.
3. Preserve ALL existing content from the original document UNLESS the improvement plan explicitly directs its modification or removal.
4. Integrate all new modules, screens, or sections as specified in the plan, ensuring they are fully detailed.
5. Adhere with extreme precision to standard BRS document structure:
    - Use H1 headings ONLY for main modules (e.g., "# MODULE NAME").
    - Use numbered H2 headings for screens (e.g., "## 1. Screen Name", "## 1.1. Sub-Screen Name").
    - Module titles should be clearly distinguishable from screen names.
    - Every module MUST have proper heading structure and organization.
        - Clear, informative paragraphs providing context for each screen.
    - Diagram sections using the placeholder: \`\`\`json\n{\"brsDiagram\": {"screenName": "Screen Title", "elements": []}}\n\`\`\`
    - Comprehensive "Extra Data" sections for each screen, detailing:
        - **Inputs**: Tables with Field, Type, Validation, Description, Sample Value (at least 5 fields per table).
        - **Processes**: Numbered lists explaining logic, data transformations, and business rules (at least 3 processes per screen).
        - **Outputs**: Descriptions of resulting data, reports, or UI changes with specific details.
6. Format every table with proper Markdown syntax:
   - Use | column1 | column2 | format
   - Include header row and separator row
   - Example:
     | Field | Type | Validation | Description | Sample Value |
     |-------|------|------------|-------------|--------------|
     | Name  | Text | Required   | User's name | John Smith   |
7. Ensure all sample data tables contain at least 7 rows of realistic, varied, and meaningful data.
8. All bullet lists MUST contain concrete, specific examples - never generic placeholders.
9. All new and modified content must be extremely detailed, leaving no room for ambiguity, as guided by the improvement plan.
10. Your final output MUST be the COMPLETE, revised BRS document in Markdown format with proper formatting.

CRITICAL INSTRUCTIONS:
- Your response must consist SOLELY of the entire updated BRS document content.
- Do NOT include any introductory phrases, summaries, explanations, or comments about your changes. Only the raw Markdown of the improved document.
- Follow the improvement plan with absolute fidelity. If the plan is detailed, your implementation must be equally detailed.
- The goal is a "hardcore," production-ready BRS document.
`;

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
      // 3. "Generate file name"
      // 4. "Create file record"
      // 5. "Generate BRS improvement plan"
      // 6. "Implement BRS improvements"
      // 7. "Save final document"
      const stepMapping: Record<
        string,
        { uiStep: string; displayName?: string }
      > = {
        upload: { uiStep: "upload", displayName: "Upload file" },
        convert: { uiStep: "convert", displayName: "Parse PDF to Markdown" },
        filename: { uiStep: "filename", displayName: "Generate file name" },
        save: { uiStep: "save", displayName: "Create file record" },
        overview: { uiStep: "overview", displayName: "Generate BRS improvement plan" },
        improve: { uiStep: "improve", displayName: "Implement BRS improvements" },
        "final-save": { uiStep: "final-save", displayName: "Save final document" },
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
            typeof parsedResponse.ssuggested_title === "string"
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

      if (
        createFileResult?.message &&
        typeof createFileResult.message === "string" &&
        /already exists/.test(createFileResult.message)
      ) {
        console.warn(
          `BRS Improve: Filename "${finalFilename}" unavailable: ${createFileResult.message}`
        );

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

        await addProgress(
          "filename",
          "completed",
          `Alternative file name generated: ${finalFilename}`
        );

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

        try {
          const retryResult = await retryResponse.json();
          if (!retryResult.file_name) {
            const errorMsg = "Filename retry did not return a valid name.";
            console.error(`BRS Improve: ${errorMsg}`);
            await addProgress("save", "failed", errorMsg);
            await sendUpdate({ type: "error", data: { message: errorMsg } });
            return;
          }

          await addProgress(
            "save",
            "completed",
            `File created successfully with alternative name: ${finalFilename}`
          );

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

      // 4. Generate BRS Improvement Plan (Overview)
      await addProgress("overview", "started", "Generating BRS improvement plan");
      console.log("BRS Improve: Generating BRS improvement plan...");

      // New: Get module names from the document first
      const moduleNames = await getModuleNamesFromDocument(markdownContent);
      let modulesPromptSection = "";
      if (moduleNames.length > 0) {
        modulesPromptSection = `\n\nThe following main modules were identified in the document and MUST be explicitly addressed and planned for in your step-by-step changes:\n- ${moduleNames.join("\n- ")}`;
        console.log("BRS Improve: Adding identified modules to overview prompt:", modulesPromptSection);
      } else {
        console.log("BRS Improve: No distinct modules identified to add to overview prompt, or document was too short.");
      }

      const overviewUserPrompt = `Here is the BRS document content that needs improvement:\n\n${markdownContent}\n${modulesPromptSection}\n\nPlease generate a detailed, step-by-step implementation plan to enhance this document according to best practices for BRS. Ensure the plan is comprehensive and covers all necessary structural and content improvements, paying specific attention to the modules listed above if any were identified. The plan should be actionable and ready for an AI to execute.`;

      const overviewContent = await callOpenAI(
        "o4-mini",
        SYSTEM_PROMPT_OVERVIEW,
        overviewUserPrompt,
        false,
      );

      if (!overviewContent || overviewContent.length < 100) {
        const errorMsg = "Failed to generate a valid BRS improvement plan. The plan was too short or empty.";
        await addProgress("overview", "failed", errorMsg);
        await sendUpdate({ type: "error", data: { message: errorMsg } });
        return;
      }

      await addProgress(
        "overview",
        "completed",
        "BRS improvement plan generated successfully"
      );
      console.log("BRS Improve: BRS improvement plan generated.");

      // 5. Implement BRS Improvements
      await addProgress("improve", "started", "Implementing BRS improvements");
      console.log("BRS Improve: Implementing BRS improvements...");

      let improvedBrsContent = "";
      
      // Function to validate BRS content quality
      const validateBrsContent = (content: string, originalModules: string[]): {
        isValid: boolean;
        reason?: string;
        missingModules?: string[];
      } => {
        // Basic length check
        if (content.length < markdownContent.length * 0.8) {
          return { isValid: false, reason: "Content is shorter than expected" };
        }

        // Check for proper Markdown formatting
        const hasProperHeadings = content.includes("# ") && content.includes("## ");
        if (!hasProperHeadings) {
          return { isValid: false, reason: "Missing proper headings structure" };
        }

        // Check for presence of tables
        const hasMarkdownTables = content.includes("|----") || content.includes("| --- ");
        if (!hasMarkdownTables) {
          return { isValid: false, reason: "Missing properly formatted tables" };
        }

        // Check for JSON diagrams
        const hasDiagrams = content.includes('```json') && content.includes('brsDiagram');
        if (!hasDiagrams) {
          return { isValid: false, reason: "Missing JSON diagrams" };
        }

        // Check for module coverage if modules were identified
        if (originalModules.length > 0) {
          const contentUpperCase = content.toUpperCase();
          const missingModules = originalModules.filter(module => {
            // Convert module name to uppercase for case-insensitive comparison
            const moduleUpperCase = module.toUpperCase();
            return !contentUpperCase.includes(moduleUpperCase);
          });
          
          if (missingModules.length > 0) {
            return { 
              isValid: false, 
              reason: "Missing some original modules", 
              missingModules 
            };
          }
        }

        return { isValid: true };
      };

      // Pass moduleNames to the implementation prompt as well
      let modulesForImplementationPrompt = "";
      if (moduleNames.length > 0) {
        modulesForImplementationPrompt = `\n\nCRITICAL REMINDER: The original document contained these main modules: [${moduleNames.join(", ")}]. Your output MUST include fully developed content for ALL these modules, as guided by the improvement plan. Do not omit or truncate any module. Each module should be its own H1 heading.`;
      }

      // Enhanced implementation prompt with more specific formatting instructions
      const implementUserPrompt = `Original BRS Document Content:\n${markdownContent}\n\nImprovement Plan (Overview):\n${overviewContent}\n${modulesForImplementationPrompt}\n
CRITICAL FORMATTING INSTRUCTIONS:
1. Use H1 headings (# MODULE NAME) ONLY for main modules - these are the highest-level organizational units
2. Use H2 headings (## 1. Screen Name) for screens within modules
3. Every table must have properly formatted headers with | separators and a separator row
4. All bullet points must contain specific, concrete information - never generic placeholders
5. Module names should be clearly distinguishable from screen names
6. Each screen must have:
   - A descriptive paragraph explaining its purpose
   - A JSON diagram in code block format
   - Input/Process/Output sections with detailed content
   - At least one properly formatted table with 7+ rows of realistic data

Please apply all improvements detailed in the plan to the original document and return the COMPLETE, revised BRS document. Ensure thorough coverage of every aspect.`;

      console.log("BRS Improve: Sending implementation prompt to model");
      
      try {
        // First attempt with o4-mini with high reasoning effort
        await sendUpdate({
          type: "progress",
          data: {
            stepId: "improve",
            status: "progress",
            message: "Processing BRS content with advanced model...",
            timestamp: Date.now(),
          }
        });
        
        const improveResponse = await openai.chat.completions.create({
          model: "o4-mini",
          reasoning_effort: "high", // Use high reasoning for better output
          messages: [
            { role: "system", content: SYSTEM_PROMPT_IMPLEMENT_IMPROVEMENTS },
            { role: "user", content: implementUserPrompt },
          ],
        });
        
        const o4MiniResult = improveResponse.choices[0].message?.content ?? "";
        
        // Validate the content quality
        const validation = validateBrsContent(o4MiniResult, moduleNames);
        
        if (!validation.isValid) {
          console.warn(
            `BRS Improve: o4-mini implementation produced invalid content. Reason: ${validation.reason}`
          );
          if (validation.missingModules) {
            console.warn(`Missing modules: ${validation.missingModules.join(', ')}`);
          }
          throw new Error(`o4-mini produced invalid content: ${validation.reason}`);
        }
        
        improvedBrsContent = o4MiniResult; // Assign if valid
        console.log("BRS Improve: BRS improvements successfully implemented with o4-mini.");
      } catch (error: any) {
        console.error("BRS Improve: o4-mini implementation failed:", error.message);
        await sendUpdate({
          type: "progress",
          data: {
            stepId: "improve",
            status: "progress",
            message: "Primary implementation failed, attempting fallback with gpt-4o...",
            timestamp: Date.now(),
          }
        });

        // Enhanced fallback attempt with gpt-4o
        try {
          // Add more specific instructions in the fallback case
          const fallbackPrompt = `${implementUserPrompt}\n\nATTENTION: The previous attempt to improve this BRS failed. Please ensure your response:
1. Includes ALL original modules: [${moduleNames.join(", ")}]
2. Has properly formatted markdown tables with header row and separator row
3. Contains detailed JSON diagrams for each screen
4. Provides comprehensive Input/Process/Output sections
5. Maintains clear hierarchy between modules (H1) and screens (H2)`;

          const gpt4oResult = await callOpenAI(
            "gpt-4o",
            SYSTEM_PROMPT_IMPLEMENT_IMPROVEMENTS,
            fallbackPrompt,
            false,
            0.2, // Lower temp for more consistent results
            8000  // Max tokens for potentially large document
          );

          // Validate the fallback result as well
          const fallbackValidation = validateBrsContent(gpt4oResult || "", moduleNames);
          
          if (!fallbackValidation.isValid) {
            console.error(
              `BRS Improve: gpt-4o fallback also produced invalid content. Reason: ${fallbackValidation.reason}`
            );
            throw new Error(`gpt-4o fallback also produced invalid content: ${fallbackValidation.reason}`);
          }
          
          improvedBrsContent = gpt4oResult || ""; // Assign if valid
          console.log("BRS Improve: BRS improvements successfully implemented with gpt-4o fallback.");
        } catch (fallbackError: any) {
          console.error("BRS Improve: gpt-4o fallback implementation also failed:", fallbackError.message);
          const errorMsg = "Failed to implement BRS improvements after fallback: " + fallbackError.message;
          await addProgress("improve", "failed", errorMsg);
          await sendUpdate({ type: "error", data: { message: errorMsg } });
          return;
        }
      }

      await addProgress(
        "improve",
        "completed",
        "BRS improvements implemented successfully"
      );
      console.log("BRS Improve: BRS improvement generation complete.");

      // Perform final quality check on the improved BRS content
      const finalQualityCheck = (content: string): boolean => {
        // Check if content looks like markdown (has # headings)
        if (!content.includes("# ")) {
          console.error("BRS Improve: Final content doesn't appear to be properly formatted markdown");
          return false;
        }

        // Check that content is substantial
        if (content.length < 2000) {
          console.error("BRS Improve: Final content is suspiciously short:", content.length);
          return false;
        }

        // Check for proper table formatting
        const tableHeaderCount = (content.match(/\|[-]{3,}\|/g) || []).length;
        if (tableHeaderCount < 3) { // Expect at least 3 tables in a good BRS
          console.warn("BRS Improve: Final content may be missing properly formatted tables");
          // Not failing on this, just a warning
        }

        // Check for common BRS structural elements
        const hasInputs = content.toLowerCase().includes("**inputs**");
        const hasProcesses = content.toLowerCase().includes("**processes**");
        const hasOutputs = content.toLowerCase().includes("**outputs**");
        
        if (!hasInputs || !hasProcesses || !hasOutputs) {
          console.error("BRS Improve: Final content is missing key IPO components");
          return false;
        }

        return true;
      };

      // Apply the final quality check
      if (!finalQualityCheck(improvedBrsContent)) {
        console.error("BRS Improve: Final content failed quality check, but proceeding anyway");
        // We're still proceeding, but logging the issue for monitoring
      }

      // 6. Save to file (Save Improved BRS Content)
      await addProgress("final-save", "started", "Saving final document");
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
        isWriterClosed = true;
      }
    }
  };

  processDocument().catch((e) =>
    console.error("BRS Import: Unhandled error in processDocument:", e)
  );

  return response;
}