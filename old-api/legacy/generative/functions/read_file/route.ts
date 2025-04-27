import PocketBase from "pocketbase";

const getPocketBaseClient = () => {
  const url = process.env.POCKETBASE_SERVER_URL;
  if (!url) {
    throw new Error("POCKETBASE_SERVER_URL environment variable is not set");
  }
  return new PocketBase(url);
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const file_name = url.searchParams.get("file_name");

    if (!file_name) {
      return Response.json({
        success: false,
        message: "file_name is required",
      });
    }

    const pb = getPocketBaseClient();

    try {
      // Use proper query escaping and structure
      const record = await pb
        .collection("files")
        .getFirstListItem(`file_name = "${file_name.replace(/"/g, '\\"')}"`, {
          fields: "id,data,created,updated",
          timeout: 10000, // 10 second timeout
        });

      if (!record?.data) {
        return Response.json({
          success: false,
          message: "File not found",
          code: 404,
        });
      }

      const latestVersion = record.data.latestVersion;
      const latestVersionData = record.data.versions[latestVersion];
      const v0 = record.data.latestVersion === 0;

      return Response.json({
        success: true,
        latestVersion: `v${latestVersion}`,
        data: latestVersionData,
        v0,
        metadata: {
          created: record.created,
          updated: record.updated,
        },
      });
    } catch (pocketbaseError) {
      console.error("PocketBase query error:", pocketbaseError);

      // Check if it's a network timeout
      if (
        typeof pocketbaseError === "object" &&
        pocketbaseError &&
        "code" in pocketbaseError &&
        pocketbaseError.code === "ETIMEDOUT"
      ) {
        return Response.json({
          success: false,
          message: "Database connection timeout",
          code: 504,
        });
      }

      // Check if record not found
      if (
        typeof pocketbaseError === "object" &&
        pocketbaseError &&
        "status" in pocketbaseError &&
        pocketbaseError.status === 404
      ) {
        return Response.json({
          success: false,
          message: "File not found",
          code: 404,
        });
      }

      throw pocketbaseError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error("Read file error:", error);
    return Response.json({
      success: false,
      code:
        typeof error === "object" && error && "status" in error
          ? error.status
          : 500,
      message: "Error reading file",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}