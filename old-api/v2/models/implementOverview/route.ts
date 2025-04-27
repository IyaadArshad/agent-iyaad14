import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { overview, file_contents, file_name } = await request.json();
    
    console.log("implementOverview received request for:", file_name);
    console.log("Overview length:", overview?.length || 0);
    console.log("File contents length:", file_contents?.length || 0);
    
    if (!overview || !file_contents) {
      return Response.json({
        code: 400,
        message: "Missing required parameters",
      }, { status: 400 });
    }

    // First attempt: Use o4-mini with reasoning for the best quality results
    try {
      const newVersionContent = await implementWithReasoning(overview, file_contents, file_name);
      
      if (newVersionContent && typeof newVersionContent === 'string' && newVersionContent.length > 100) {
        console.log(`Successfully generated new version content (${newVersionContent.length} chars)`);
        return Response.json({
          code: 200,
          message: "Successfully generated updated document content",
          newVersion: newVersionContent,
        });
      }
    } catch (reasoningError) {
      console.error("Reasoning implementation failed:", reasoningError);
      // Continue to fallback
    }
    
    // Second attempt: Use chunking strategy
    try {
      const newVersionContent = await implementWithChunking(overview, file_contents, file_name);
      
      if (newVersionContent && typeof newVersionContent === 'string' && newVersionContent.length > 100) {
        console.log(`Successfully generated new version with chunking (${newVersionContent.length} chars)`);
        return Response.json({
          code: 200,
          message: "Successfully generated updated document content with chunking",
          newVersion: newVersionContent,
        });
      }
    } catch (chunkingError) {
      console.error("Chunking implementation failed:", chunkingError);
      // Continue to fallback
    }
    
    // Fallback: Use direct module addition approach
    const newVersionContent = await implementWithModuleAddition(overview, file_contents, file_name);
    
    if (!newVersionContent || typeof newVersionContent !== 'string' || newVersionContent.length < 100) {
      throw new Error("Failed to generate valid content with any method");
    }
    
    return Response.json({
      code: 200,
      message: "Successfully generated updated document content with fallback method",
      newVersion: newVersionContent,
    });
    
  } catch (error) {
    console.error("Error in implementOverview after retries:", error);
    return Response.json({
      code: 500,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Implementation with reasoning model (o4-mini)
async function implementWithReasoning(overview: any, file_contents: any, file_name: any) {
  console.log("Attempting implementation with reasoning model");
  
  const systemPrompt = `You are a specialized BRS document editor that implements changes to existing documents.
  
Your task:
1. Analyze the provided document content and the requested changes
2. Keep ALL existing content unless explicitly requested to change or remove it
3. Add all requested modules as new sections in the document
4. Follow BRS document structure exactly:
   - H1 headings for main modules
   - H2 headings for screens (numbered)
   - Info paragraphs
   - Diagram sections
   - Detailed specifications
5. Include sample data in tables with at least 7 rows where appropriate
6. Be extremely detailed in all new content
7. Return the COMPLETE updated document with all changes integrated

IMPORTANT: Your response should be the entire document with changes applied, not just the changes.
Do not include explanations or comments about your changes - only return the document content.`;

  const userPrompt = `Document: "${file_name}"
  
Current content:
${file_contents}

Requested changes:
${overview}

Return the entire updated document with all changes applied, keeping all existing content intact unless explicitly asked to modify it.`;

  const response = await openai.chat.completions.create({
    model: "o4-mini",
    reasoning_effort: "high",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });
  
  const content = response.choices[0]?.message?.content;
  
  if (!content || typeof content !== 'string' || content.length < 100) {
    throw new Error("Reasoning model returned insufficient content");
  }
  
  return content.trim();
}

// Implementation with chunking strategy
async function implementWithChunking(overview: any, file_contents: string, file_name: any) {
  console.log("Implementing overview with chunking strategy");
  
  // First identify existing modules and required new modules
  const moduleAnalysisPrompt = `
Analyze the following BRS document and identify:
1. All existing modules (H1 headings)
2. All new modules that need to be added based on the overview
3. The structure of each required new module

Document: ${file_name}
Current content (excerpt):
${file_contents.substring(0, 3000)}... (truncated)

Required changes:
${overview}

Return your analysis in JSON format with these fields:
- existingModules: array of module names
- newModules: array of module names to be added
- moduleStructure: object with module names as keys and their structures as values
`;

  const analysisResponse = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "You analyze BRS documents and identify modules and required changes." },
      { role: "user", content: moduleAnalysisPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2
  });
  
  let moduleStructure;
  try {
    const analysisContent = analysisResponse.choices[0]?.message?.content;
    if (!analysisContent) throw new Error("Empty analysis response");
    
    moduleStructure = JSON.parse(analysisContent);
    console.log("Module analysis complete:", JSON.stringify(moduleStructure, null, 2));
  } catch (error) {
    console.error("Failed to parse module analysis:", error);
    throw new Error("Module analysis failed");
  }
  
  // Extract existing modules - either from analysis or by regex matching
  const existingModuleNames = moduleStructure.existingModules || [];
  const newModuleNames = moduleStructure.newModules || [];
  
  if (newModuleNames.length === 0) {
    throw new Error("No new modules identified for addition");
  }
  
  // Process existing document to identify module sections
  let updatedDocument = file_contents;
  const moduleRegex = /^#\s+(.*?)(?=\n#\s+|\n$)/gms;
  const moduleMatches = [...file_contents.matchAll(moduleRegex)];
  
  // Create content for each new module
  for (const moduleName of newModuleNames) {
    console.log(`Generating content for new module: ${moduleName}`);
    
    const modulePrompt = `
Create a comprehensive BRS document section for the "${moduleName}" module based on these requirements:

Overview of changes needed:
${overview}

The module should follow BRS structure:
1. Start with H1 heading for module name
2. Include H2 headings for all screens (numbered)
3. Each screen should have:
   - Detailed description paragraph
   - Code block for diagram (use "{\\"brsDiagram\\": {}}" as placeholder)
   - Specifications for inputs, processing, outputs
   - Sample data tables with at least 7 rows where appropriate
4. Include all master files, transactions, reports mentioned in the overview
5. Be extremely detailed and specific about requirements

Return ONLY the complete markdown content for this module, starting with the H1 heading.`;

    const moduleResponse = await openai.chat.completions.create({
      model: "o4-mini",
      reasoning_effort: "medium",
      messages: [
        { 
          role: "system", 
          content: "You create detailed BRS document module content following strict formatting guidelines." 
        },
        { role: "user", content: modulePrompt }
      ]
    });
    
    const moduleContent = moduleResponse.choices[0]?.message?.content;
    
    if (!moduleContent || moduleContent.length < 100) {
      console.error(`Failed to generate content for module ${moduleName}`);
      continue;
    }
    
    // Add the new module to the document
    updatedDocument += "\n\n" + moduleContent;
    console.log(`Added module ${moduleName} (${moduleContent.length} chars)`);
  }
  
  return updatedDocument;
}

// Fallback implementation strategy
async function implementWithModuleAddition(overview: any, file_contents: string | string[], file_name: any) {
  console.log("Using fallback module addition strategy");
  
  // Identify missing modules from the overview
  const missingModulesPrompt = `
Based on this overview of changes:
${overview}

And knowing these modules exist in the BRS document:
${file_contents.includes('# Stock & Sales Module') ? '- Stock & Sales Module' : ''}
${file_contents.includes('# Accounts Receivable Module') ? '- Accounts Receivable Module' : ''}
${file_contents.includes('# Accounts Payable Module') ? '- Accounts Payable Module' : ''}
${file_contents.includes('# Manufacturing Module') ? '- Manufacturing Module' : ''}
${file_contents.includes('# Petty Cash Module') ? '- Petty Cash Module' : ''}
${file_contents.includes('# Sugar Tax Module') ? '- Sugar Tax Module' : ''}

List only the module names that need to be added (do not list existing ones).
Format your response as a JSON array of strings.`;

  const modulesResponse = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: "You analyze BRS documents and identify missing modules." },
      { role: "user", content: missingModulesPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });
  
  let missingModules;
  try {
    const modulesContent = modulesResponse.choices[0]?.message?.content;
    missingModules = JSON.parse(modulesContent);
    console.log("Missing modules identified:", missingModules);
  } catch (error) {
    console.error("Failed to identify missing modules:", error);
    missingModules = [];
  }
  
  if (!Array.isArray(missingModules) || missingModules.length === 0) {
    console.log("No missing modules identified, returning original content");
    return file_contents;
  }
  
  // Generate content for all missing modules at once
  const allModulesPrompt = `
Create complete BRS document sections for these missing modules:
${missingModules.join(', ')}

Based on these requirements:
${overview}

For each module:
1. Start with H1 heading for module name
2. Include H2 headings for all screens (numbered)
3. Each screen should have detailed descriptions, placeholder diagrams with "{\\"brsDiagram\\": {}}", 
   and sample data in tables with at least 7 rows where appropriate
4. Be extremely detailed about requirements, validations, and processes

Return the complete markdown content for ALL missing modules concatenated together.`;

  const contentResponse = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { 
        role: "system", 
        content: "You create detailed BRS document content for multiple modules following strict formatting guidelines." 
      },
      { role: "user", content: allModulesPrompt }
    ],
    temperature: 0.2,
  });
  
  const modulesContent = contentResponse.choices[0]?.message?.content;
  
  if (!modulesContent || modulesContent.length < 100) {
    throw new Error("Failed to generate content for missing modules");
  }
  
  // Append new content to the original document
  return file_contents + "\n\n" + modulesContent;
}