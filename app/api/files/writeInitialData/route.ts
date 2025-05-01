export async function POST(request: Request) {
  let body;

  try {
    body = await request.json();

    if (!body.file_name || !body.data) {
      return Response.json(
        {
          success: false,
          message:
            "Missing required parameters: file_name and data are required",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error parsing request JSON:", error);
    return Response.json(
      {
        success: false,
        message: "Invalid JSON payload",
      },
      { status: 400 }
    );
  }

  const fileName = body.file_name;
  const data = body.data;

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
    const recordData = file.data || {};

    // Check if the file already has versions
    if (recordData.latestVersion && recordData.latestVersion > 0) {
      return Response.json({
        success: false,
        message: `${fileName} is already initialized, please use publishNewVersion to create a new version`,
        systemMessage: `File already has some versions. Use publishNewVersion instead.`,
        file_name: fileName,
      });
    }

    // Initialize with version 1
    recordData.latestVersion = 1;
    if (!recordData.versions) {
      recordData.versions = {};
    }
    recordData.versions[1] = data;

    // Update the file record
    const updateRes = await fetch(
      `https://database.acroford.com/files?id=eq.${file.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          data: recordData,
        }),
      }
    );

    if (!updateRes.ok) {
      return Response.json(
        { success: false, message: "Failed to update file" },
        { status: updateRes.status }
      );
    }

    return Response.json({
      success: true,
      message: `${fileName} has been successfully initialized`,
      systemMessage: `The first version is now v1. Use publishNewVersion to publish subsequent versions.`,
      file_name: fileName,
    });
  } catch (error) {
    console.error("Error initializing file:", error);
    return Response.json(
      {
        success: false,
        message: "Error initializing file",
      },
      { status: 500 }
    );
  }
}