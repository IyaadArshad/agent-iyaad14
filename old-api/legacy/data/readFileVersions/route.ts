import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function GET(request: Request) {
    if (!process.env.POCKETBASE_SERVER_URL) {
        return Response.json({ code: 500, message: "Missing PocketBase server URL" });
    }

    // file_name and version from query parameters
    const url = new URL(request.url);
    const file_name = url.searchParams.get("file_name");
    const version = url.searchParams.get("version");

    if (!file_name || !version) {
        return Response.json({ success: false, message: "file_name and version are required" });
    }

    try {
        const record = await pb
            .collection("files")
            .getFirstListItem(`file_name='${file_name}'`, { fields: "id, data" });

        if (parseInt(version) < 1) {
            return Response.json({ success: false, message: "version should be greater than 0" });
        }
        
        const versionData = record.data.versions[version];
        if (!versionData) {
            return Response.json({ success: false, message: "that version doesn't exist or has not been published." });
        }

        const specifiedVersion = versionData;

        return Response.json({
            success: true,
            version: specifiedVersion,
            notes: `You are seeing version ${version}.0 of the file as data.`,
        });
    } catch (error) {
        return Response.json({ code: 404, message: "file not found" });
    }
}