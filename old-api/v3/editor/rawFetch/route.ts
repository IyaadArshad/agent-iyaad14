// raw fetch record for editor by file_name
import { NextResponse } from "next/server";
import PocketBase from "pocketbase";

const pb = new PocketBase("https://pocketbase.acroford.com");

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const file_name = searchParams.get("file_name");

    if (!file_name) {
      return NextResponse.json({
        success: false,
        message: "file_name is required",
        code: 400,
        data: null,
      });
    }

    const record = await pb
      .collection("files")
      .getFirstListItem(`file_name="${file_name}"`);

    return NextResponse.json({
      success: true,
      message: `File with name ${file_name} fetched successfully`,
      code: 200,
      data: record,
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      message: "File Not Found",
      code: 404,
      data: null,
    });
  }
}