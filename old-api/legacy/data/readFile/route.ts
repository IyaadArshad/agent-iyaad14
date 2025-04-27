import PocketBase from "pocketbase";


const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function GET(request: Request) {
  // file_name from query parameters
  const url = new URL(request.url);
  const file_name = url.searchParams.get("file_name");

  if (!file_name) {
    return Response.json({ code: 400, message: "file_name is required" });
  }

  // get the file id, or return a 404
  /**
   * record.data looks like this
   * {
  "latestVersion": 1,
  "name": "fileName",
  "versions": {
    "1": "hidhsai"
  }
}
  check the latest version, then get that from versions, and return the latest version back to the users
   */

  try {
    const record = await pb
      .collection("files")
      .getFirstListItem(`file_name='${file_name}'`, { fields: "id, data" });

    const latestVersion = record.data.latestVersion;
    const latestVersionData = record.data.versions[latestVersion];

    return Response.json({
      success: true,
      latestVersion: `v${latestVersion}`,
      data: latestVersionData,
      notes: "You are seeing the latest version of the file as data. To see previous versions, call the /api/legacy/data/readFileVersions endpoint",
    });
  } catch (error) {
    return Response.json({ code: 404, message: "file not found" });
  }
}