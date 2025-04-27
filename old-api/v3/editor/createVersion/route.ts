import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pb = new PocketBase("https://pocketbase.acroford.com");

export async function POST(request: Request) {
  try {
    const { fileId, currentVersion, content } = await request.json();

    if (!fileId || currentVersion === undefined || content === undefined) {
      return NextResponse.json({
        success: false,
        message: "fileId, currentVersion, and content are required",
        code: 400,
        data: null,
      });
    }

    // Fetch the current file record
    const record = await pb.collection("files").getOne(fileId);

    // Create a new version
    const fileData = record.data;
    const newVersionNumber = currentVersion + 1;

    // Add the new version
    fileData.versions[newVersionNumber] = content;

    // Update latest version number
    fileData.latestVersion = newVersionNumber;

    // Update the record with the modified data
    const updatedRecord = await pb.collection("files").update(fileId, {
      data: fileData,
    });

    return NextResponse.json({
      success: true,
      message: "New version created successfully",
      code: 200,
      data: {
        latestVersion: newVersionNumber,
        record: updatedRecord,
      },
    });
  } catch (e) {
    console.error("Error creating new version:", e);
    return NextResponse.json({
      success: false,
      message: e instanceof Error ? e.message : "An unknown error occurred",
      code: 500,
      data: null,
    });
  }
}