import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function POST(request: Request) {
  const { file_name: fileName } = await request.json();

  if (!fileName) {
    return Response.json(
      { error: "Missing required parameters, file_name is not provided" },
      { status: 422 }
    );
  }
  try {
    const existingFile = await pb
      .collection("files")
      .getFirstListItem(`file_name="${fileName}"`);

    if (existingFile) {
      return Response.json(
        {
          success: false,
          message: `A file with the name **${fileName}** already exists, choose another name`,
          systemMessage: `If the user has specifically requested this file name, let them know that this name has been used. If a name is not specified, choose another name yourself. Remember, ${fileName} is not available`
        }
      );
    }
  } catch (error) {
    // file does not exist
  }

  if (fileName.length > 500) {
    return Response.json(
      {
        success: false,
        message: `**'${fileName}'** is too long, pick a shorter name under 500 characters`,
      }
    );
  }
  if (fileName.length < 2) {
    return Response.json(
      {
        success: false,
        message: `**'${fileName}'** is too short, pick a longer name over 2 characters`,
      }
    );
  }

  const initialData = {
    name: `${fileName}`,
    latestVersion: 0,
    versions: {}
  }

  const data = {
    file_name: fileName,
    data: initialData,
  };

  const record = await pb.collection("files").create(data);

  return Response.json({
    success: "true",
    message: `**${fileName}** has been successfully created`,
    systemMessage: `You've created an empty file called ${fileName}, you will need to remember this name for API requests using this file. To start with this file, you must first perform a writeInitialData to create the first version. any updates after that can use implement_edits`,
    file_name: fileName,
  });
}