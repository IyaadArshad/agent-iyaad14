export async function GET(request: Request) {
  // Get file_name and optional version from query parameters
  const url = new URL(request.url);
  const fileName = url.searchParams.get("file_name");
  const version = url.searchParams.get("version");

  // Validate required parameters
  if (!fileName) {
    return Response.json(
      { success: false, message: "Missing required parameter: file_name" },
      { status: 400 }
    );
  }

  try {
    // Fetch the file by name
    const fileRes = await fetch(
      `https://database.acroford.com/files?file_name=eq.${encodeURIComponent(
        fileName
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!fileRes.ok) {
      return Response.json(
        { success: false, message: "Failed to fetch file data" },
        { status: fileRes.status }
      );
    }

    const files = await fileRes.json();

    if (!files || files.length === 0) {
      return Response.json(
        {
          success: false,
          message: `File not found: ${fileName}`,
        },
        { status: 404 }
      );
    }

    const file = files[0];
    const fileData = file.data;

    if (!fileData || !fileData.versions || !fileData.latestVersion) {
      return Response.json(
        {
          success: false,
          message: "File exists but has no version data",
        },
        { status: 404 }
      );
    }

    // If version is specified, return that version
    // Otherwise return the latest version
    const requestedVersion = version
      ? parseInt(version, 10)
      : fileData.latestVersion;

    if (!fileData.versions[requestedVersion]) {
      return Response.json(
        {
          success: false,
          message: `Version ${requestedVersion} not found for file ${fileName}`,
        },
        { status: 404 }
      );
    }

    const versionData = fileData.versions[requestedVersion];

    return Response.json({
      success: true,
      file_name: fileName,
      version: requestedVersion,
      latestVersion: fileData.latestVersion,
      data: versionData,
      notes: version
        ? "You are viewing a specific version of the file."
        : "You are viewing the latest version of the file. To view a specific version, add the version parameter to your request.",
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return Response.json(
      {
        success: false,
        message: "Error reading file",
      },
      { status: 500 }
    );
  }
}