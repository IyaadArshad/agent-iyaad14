import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = "vs_68105b5138988191b34dda8e0818e57d";

export async function POST(request: NextRequest) {
  try {
    // Parse the formData to get the file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" },
        { status: 400 }
      );
    }

    // Check if file type is supported
    const supportedTypes = [
      "text/plain", "text/markdown", "text/x-c", "text/x-c++", 
      "text/x-csharp", "text/css", "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/x-golang", "text/html", "text/x-java", "text/javascript",
      "application/json", "text/markdown", "application/pdf",
      "text/x-php", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/x-python", "text/x-script.python", "text/x-ruby",
      "application/x-sh", "text/x-tex", "application/typescript"
    ];

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Unsupported file type" },
        { status: 400 }
      );
    }

    // Write the file to a temporary location
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${randomUUID()}-${file.name}`);
    
    // Convert File to buffer and write to filesystem (required for OpenAI SDK)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    try {
      // Upload the file using OpenAI's API
      const fileUpload = await openai.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: "assistants",
      });

      // Add the file to the vector store
      await openai.vectorStores.files.create(
        VECTOR_STORE_ID,
        {
          file_id: fileUpload.id,
        }
      );

      // Check status until ready or timeout
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isReady && attempts < maxAttempts) {
        attempts++;
        // Get list of files in vector store
        const result = await openai.vectorStores.files.list(VECTOR_STORE_ID);
        
        // Find our file in the results
        const fileStatus = result.data.find(f => f.id === fileUpload.id);
        
        if (fileStatus && fileStatus.status === "completed") {
          isReady = true;
        } else {
          // Wait 1 second before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully",
        fileId: fileUpload.id,
        fileName: file.name,
        isReady
      });
    } finally {
      // Clean up the temporary file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }
    }
    
  } catch (error) {
    console.error("Error uploading file to vector store:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}