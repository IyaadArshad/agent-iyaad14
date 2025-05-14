import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Ensure OPENAI_API_KEY is set in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Determine the base URL for internal API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
  model: 'gpt-4.1-nano' | 'gpt-4o' | 'o4-mini',
  systemPrompt: string,
  userPrompt: string,
  isJsonOutput: boolean = false
): Promise<string | null> {
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: model,
      messages: messages,
    };

    if (isJsonOutput && model === 'gpt-4.1-nano') {
      params.response_format = { type: 'json_object' };
    }

    const completion = await openai.chat.completions.create(params);
    console.log(completion)
    return completion.choices[0].message?.content ?? null;
  } catch (err) {
    const error = err as OpenAIError;
    console.error(`Error calling OpenAI model ${model}:`, error.status, error.message, error.error);
    // Rethrow or handle as appropriate for the flow
    throw new Error(`OpenAI API call failed for model ${model}: ${error.message}`);
  }
}

// System Prompts
const SYSTEM_PROMPT_OVERVIEW = `You are an expert Business Requirements Specification (BRS) engineer. You will be provided with a raw BRS document in Markdown. Your task is to generate an in-depth, step-by-step implementation overview that uncovers and maps every aspect of the submitted document.

1. Begin with a single first-person sentence under 30 words: “I’ll generate a comprehensive implementation plan for improving this BRS document,” and nothing else on that line.

2. Analyze the full document structure: detect all H1 modules, H2 screen sections, sub-screens, lists, tables, calculations, functions, and notes.

3. Provide a header “Step-by-step changes:” then a concise paragraph stating you will list concrete actions. Below, produce a numbered list of 10–14 items where each step:
   a. References exact document elements (e.g., specific H1 module titles like “STOCK & SALES MODULE,” H2 sections such as “Common,” “Master Files,” “Transaction,” etc.).
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

This overview will guide both human reviewers and AI code generators to produce a final, polished, detailed BRS in Markdown.`;


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
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdownContent, originalFilename } = body;

    if (!markdownContent || typeof markdownContent !== 'string') {
      return NextResponse.json({ success: false, message: 'Markdown content is required and must be a string.' }, { status: 400 });
    }
    if (!originalFilename || typeof originalFilename !== 'string') {
      return NextResponse.json({ success: false, message: 'Original filename is required and must be a string.' }, { status: 400 });
    }

    console.log(`BRS Improve: Starting process for "${originalFilename}"`);

    // 1. Generate Implementation Overview
    console.log('BRS Improve: Generating implementation overview...');
    const overviewContent = await callOpenAI('o4-mini', SYSTEM_PROMPT_OVERVIEW, markdownContent);
    if (!overviewContent) {
      console.error('BRS Improve: Failed to generate implementation overview.');
      return NextResponse.json({ success: false, message: 'Failed to generate implementation overview.' }, { status: 500 });
    }
    console.log('BRS Improve: Overview generated.');

    // 2. Generate Filename
    console.log('BRS Improve: Generating filename...');
    const filenamePromptContent = `Original filename: ${originalFilename}\nBRS Content Summary (first 500 chars):\n${markdownContent.substring(0, 500)}`;
    const nanoResponseJson = await callOpenAI('gpt-4.1-nano', SYSTEM_PROMPT_FILENAME_NANO, filenamePromptContent, true);
    
    let suggestedTitle = '';
    if (nanoResponseJson) {
      try {
        const parsedResponse = JSON.parse(nanoResponseJson);
        if (parsedResponse.suggested_title && typeof parsedResponse.suggested_title === 'string') {
          suggestedTitle = parsedResponse.suggested_title
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/[^a-z0-9-]/g, ''); // Remove invalid characters
          if (!suggestedTitle) { // Handle cases where sanitization results in an empty string
             throw new Error("Sanitized title is empty.");
          }
        } else {
          throw new Error('\'suggested_title\' not found or not a string in gpt-4.1-nano response.');
        }
      } catch (e: any) {
        console.error('BRS Improve: Failed to parse filename from gpt-4.1-nano. Response:', nanoResponseJson, 'Error:', e.message);
        suggestedTitle = `improved-brs-${Date.now()}`.replace(/[^a-z0-9-]/g, '');
      }
    } else {
      console.error('BRS Improve: No response from gpt-4.1-nano for filename.');
      suggestedTitle = `improved-brs-${Date.now()}`.replace(/[^a-z0-9-]/g, '');
    }
    let finalFilename = `${suggestedTitle}.md`;
    console.log(`BRS Improve: Filename generated: "${finalFilename}"`);

    // 3. Create File Record
    console.log('BRS Improve: Creating file record...');
    const createFilePayload = { file_name: finalFilename }; // match required param
    const createFileResponse = await fetch(`${API_BASE_URL}/api/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createFilePayload),
    });

    if (!createFileResponse.ok) {
        const errorData = await createFileResponse.json().catch(() => ({ message: createFileResponse.statusText }));
        console.error('BRS Improve: Failed to create file record:', errorData);
        return NextResponse.json({ success: false, message: `Failed to create file record: ${errorData.message}` }, { status: createFileResponse.status });
    }
    const createFileResult = await createFileResponse.json();
    // Initialize fileId from initial create response
    let fileId: string | undefined = typeof createFileResult.file_name === 'string'
      ? createFileResult.file_name
      : undefined;

    // Handle name collision: ask GPT-4.1-nano for an alternative filename and retry
    if (createFileResult.success === false && /already exists/.test(createFileResult.message)) {
      console.warn(`BRS Improve: Filename "${finalFilename}" unavailable: ${createFileResult.message}`);
      
      // More explicit prompt for a truly different filename
      const altFilenamePrompt = `${filenamePromptContent}
      
IMPORTANT: The filename "${suggestedTitle}" is already taken. Generate a COMPLETELY DIFFERENT name with additional modifiers or alternate terminology.
For example, if "inventory-management" is taken, suggest something like "stock-control-system" instead of just adding a number.`;
      
      const altNanoJson = await callOpenAI('gpt-4.1-nano', SYSTEM_PROMPT_FILENAME_NANO, altFilenamePrompt, true);
      let altTitle = '';
      
      try {
        const altParsed = JSON.parse(altNanoJson || '{}');
        if (altParsed.suggested_title && typeof altParsed.suggested_title === 'string') {
          altTitle = altParsed.suggested_title
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        }
      } catch (e) {
        console.error('BRS Improve: Failed to parse alt filename:', e);
      }
      
      // Guarantee uniqueness with timestamp even if altTitle matches or is empty
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      if (!altTitle || altTitle === suggestedTitle) {
        // If same title returned or parsing failed, use timestamp to make it unique
        suggestedTitle = `${suggestedTitle}-v${timestamp}`;
      } else {
        // Use the alternative title if it's different
        suggestedTitle = altTitle;
      }
      
      finalFilename = `${suggestedTitle}.md`;
      console.log(`BRS Improve: Retrying with new filename: "${finalFilename}"`);
      const retryResponse = await fetch(`${API_BASE_URL}/api/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: finalFilename }),
      });
      if (!retryResponse.ok) {
        const retryErr = await retryResponse.json().catch(() => ({}));
        return NextResponse.json({ success: false, message: `Retry create file failed: ${retryErr.message}` }, { status: retryResponse.status });
      }
      const retryResult = await retryResponse.json();
      if (!retryResult.file_name) {
        return NextResponse.json({ success: false, message: 'Filename retry did not return a valid name.' }, { status: 500 });
      }
      fileId = retryResult.file_name;
      console.log(`BRS Improve: File record created with new name: ${fileId}`);
    }
    
    // Original path if no collision or after retry
    if (!fileId) {
      console.error('BRS Improve: File name not returned in create file response:', createFileResult);
      return NextResponse.json({ success: false, message: 'Failed to get file identifier after file creation.' }, { status: 500 });
    }
    console.log(`BRS Improve: File record created with name: ${fileId}`);

    // 4. Generate Improved BRS Content
    console.log('BRS Improve: Generating improved BRS content...');
    const improvePrompt = `Original BRS Markdown (might be partial or rough):\n\n${markdownContent}\n\nStrictly follow this Implementation Overview to improve the BRS:\n\n${overviewContent}`;
    const improvedBrsContent = await callOpenAI('gpt-4o', SYSTEM_PROMPT_IMPROVE_BRS, improvePrompt);
    if (!improvedBrsContent) {
      console.error('BRS Improve: Failed to generate improved BRS content.');
      return NextResponse.json({ success: false, message: 'Failed to generate improved BRS content.' }, { status: 500 });
    }
    console.log('BRS Improve: Improved BRS content generated.');

    // 5. Save Improved BRS Content
    console.log('BRS Improve: Saving improved BRS content...');
    // The API /api/files/writeInitialData expects { file_name, data }
    const writeDataPayload = { file_name: finalFilename, data: improvedBrsContent };
    const writeDataResponse = await fetch(`${API_BASE_URL}/api/files/writeInitialData`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(writeDataPayload),
    });

    if (!writeDataResponse.ok) {
        const errorData = await writeDataResponse.json().catch(() => ({ message: writeDataResponse.statusText }));
        console.error('BRS Improve: Failed to write initial data for improved BRS:', errorData);
        return NextResponse.json({ success: false, message: `Failed to save improved BRS content: ${errorData.message}` }, { status: writeDataResponse.status });
    }
    const writeDataResult = await writeDataResponse.json();
    console.log('BRS Improve: Improved BRS content saved.', writeDataResult);

    return NextResponse.json({
      success: true,
      message: 'BRS improved successfully.',
      newDocumentName: finalFilename,
      newDocumentId: fileId,
      // For debugging or client use, you might include these:
      // overview: overviewContent,
      // generatedContentLength: improvedBrsContent.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('BRS Improve: Unhandled error in /api/brs/improve:', error.message, error.stack);
    let message = 'An unexpected error occurred.';
    if (error.message.includes('OpenAI API call failed')) {
        message = error.message; // Propagate OpenAI specific errors
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
