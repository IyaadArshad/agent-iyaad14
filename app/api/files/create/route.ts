export async function POST(request: Request) {
  const { file_name: fileName } = await request.json();

  if (!fileName) {
    return Response.json(
      { error: "Missing required parameters, file_name is not provided" },
      { status: 422 }
    );
  }

  // Make sure file is a-z, A-Z, 0-9, - only,
  // NO SPACE
  // NO '_'
  // MUST END IN .md
  const regex = /^[a-zA-Z0-9-]+\.md$/;
  if (!regex.test(fileName)) {
    return Response.json({
      success: false,
      message: `**'${fileName}'** is not a valid file name, it must only contain letters, numbers, and dashes, and must end with .md (a-z, A-Z, 0-9, - only + ends in .md required)`,
    });
  }

  // Check for name length constraints
  if (fileName.length > 500) {
    return Response.json({
      success: false,
      message: `**'${fileName}'** is too long, pick a shorter name under 500 characters`,
    });
  }
  if (fileName.length < 2) {
    return Response.json({
      success: false,
      message: `**'${fileName}'** is too short, pick a longer name over 2 characters`,
    });
  }

  try {
    const checkRes = await fetch(
      `https://database.acroford.com/files?file_name=eq.${encodeURIComponent(
        fileName
      )}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!checkRes.ok) {
      return Response.json(
        { error: "Failed to check for existing files" },
        { status: checkRes.status }
      );
    }

    const existingFiles = await checkRes.json();
    if (existingFiles && existingFiles.length > 0) {
      return Response.json({
        success: false,
        message: `A file with the name **${fileName}** already exists, choose another name`,
        systemMessage: `If the user has specifically requested this file name, let them know that this name has been used. If a name is not specified, choose another name yourself. Remember, ${fileName} is not available`,
      });
    }
  } catch (error) {
    return Response.json(
      { error: "Error checking for file existence" },
      { status: 500 }
    );
  }

  // Create initial data structure
  const initialData = {
    name: `${fileName}`,
    latestVersion: 0,
    versions: {},
  };

  const data = {
    file_name: fileName,
    data: initialData,
  };

  // Create the file using PostgREST
  try {
    const createRes = await fetch("https://database.acroford.com/files", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });

    if (!createRes.ok) {
      return Response.json(
        { error: "Failed to create file" },
        { status: createRes.status }
      );
    }

    const record = await createRes.json();

    return Response.json({
      success: "true",
      message: `**${fileName}** has been successfully created`,
      systemMessage: `You've created an empty file called ${fileName}, you will need to remember this name for API requests using this file. To start with this file, you must first perform a writeInitialData to create the first version. any updates after that can use implement_edits`,
      file_name: fileName,
    });
  } catch (error) {
    return Response.json({ error: "Error creating file" }, { status: 500 });
  }
}