
import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function POST(request: Request) {
  try {
    const { fileName, version } = await request.json();
    if (!fileName || !version) {
      return Response.json({ success: false, message: "Missing parameters" });
    }

    const record = await pb
      .collection("files")
      .getFirstListItem(`file_name='${fileName}'`);
    const versions = record.data.versions; // e.g. { v0: "...", v1: "...", v2: "...", ... }

    if (!versions[version]) {
      return Response.json({ success: false, message: "Version not found" });
    }

    // Remove everything after this version
    const filtered: Record<string, string> = {};
    for (const key of Object.keys(versions)) {
      // keep versions <= selected version
      if (parseInt(key.replace("v", "")) <= parseInt(version.replace("v", ""))) {
        filtered[key] = versions[key];
      }
    }

    // Update the record
    await pb.collection("files").update(record.id, {
      data: {
        latestVersion: parseInt(version.replace("v", "")),
        versions: filtered,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, message: "Error restoring version" });
  }
}