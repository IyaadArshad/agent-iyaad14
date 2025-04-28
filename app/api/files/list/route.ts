export async function GET() {
  try {
    const res = await fetch("https://database.acroford.com/files", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return Response.json(
        { success: false, message: "Failed to fetch files" },
        { status: res.status }
      );
    }

    const files = await res.json();

    // Extract file names and sort them alphabetically
    const fileNames = files
      .map((file: { file_name: string }) => file.file_name)
      .sort();

    return Response.json({
      success: true,
      count: fileNames.length,
      files: fileNames,
    });
  } catch (error) {
    console.error("Error listing files:", error);
    return Response.json(
      { success: false, message: "Error listing files" },
      { status: 500 }
    );
  }
}