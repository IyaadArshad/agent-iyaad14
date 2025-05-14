import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

/**
 * API route that converts PDF to Markdown text for BRS improvement
 */
export async function POST(request: NextRequest) {
  try {
    // We expect a PDF file in the request
    const formData = await request.formData();
    const pdfFile = formData.get('file') as File | null;
    
    if (!pdfFile) {
      return NextResponse.json({ 
        success: false, 
        message: 'No PDF file provided' 
      }, { status: 400 });
    }
    
    // Check if the file is a PDF
    if (!pdfFile.type.includes('pdf')) {
      return NextResponse.json({ 
        success: false, 
        message: 'File is not a PDF' 
      }, { status: 400 });
    }

    // Get the file buffer
    const fileBuffer = await pdfFile.arrayBuffer();
    
    // Convert PDF to text
    const pdfData = await pdfParse(Buffer.from(fileBuffer));
    
    // Basic markdown conversion - this could be enhanced with more structure detection
    let markdownContent = `# ${pdfFile.name.replace('.pdf', '')}\n\n`;
    
    // Split content by lines to detect potential headers and sections
    const lines = pdfData.text.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Try to detect headers (ALL CAPS or numbered sections often indicate headers)
      if (/^\d+\./.test(trimmedLine) || /^[A-Z\s]{5,}$/.test(trimmedLine)) {
        markdownContent += `\n## ${trimmedLine}\n\n`;
      } 
      // Detect potential sub-headers
      else if (/^\d+\.\d+/.test(trimmedLine)) {
        markdownContent += `\n### ${trimmedLine}\n\n`;
      }
      // Detect potential list items 
      else if (/^[•\-*]/.test(trimmedLine) || /^\d+\)/.test(trimmedLine)) {
        markdownContent += `* ${trimmedLine.replace(/^[•\-*]\s*/, '')}\n`;
      }
      // Regular paragraph
      else {
        markdownContent += `${trimmedLine}\n\n`;
      }
    }

    // Return the markdown content along with the original filename
    return NextResponse.json({
      success: true,
      markdownContent,
      originalFilename: pdfFile.name
    });
  } catch (error: any) {
    console.error('PDF to Markdown conversion error:', error);
    return NextResponse.json({ 
      success: false, 
      message: `PDF conversion error: ${error.message}` 
    }, { status: 500 });
  }
}
