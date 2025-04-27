import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pb = new PocketBase("https://pocketbase.acroford.com");

export async function POST(request: Request) {
  try {
    const { fileId, version, content } = await request.json();

    if (!fileId || version === undefined || content === undefined) {
      return NextResponse.json({
        success: false,
        message: "fileId, version, and content are required",
        code: 400,
        data: null,
      });
    }

    // Fetch the current file record
    const record = await pb.collection("files").getOne(fileId);

    // Update the content of the specific version
    const fileData = record.data;
    fileData.versions[version] = content;

    // Update the record with the modified data
    const updatedRecord = await pb.collection("files").update(fileId, {
      data: fileData,
    });

    return NextResponse.json({
      success: true,
      message: "File updated successfully",
      code: 200,
      data: updatedRecord,
    });
  } catch (e) {
    console.error("Error updating file:", e);
    return NextResponse.json({
      success: false,
      message: e instanceof Error ? e.message : "An unknown error occurred",
      code: 500,
      data: null,
    });
  }
}