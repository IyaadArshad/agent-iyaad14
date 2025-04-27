import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function POST(request: Request) {
  console.log("publishNewVersion API called");
  let body;
  
  try {
    body = await request.json();
    console.log("Request body received:", JSON.stringify({
      has_file_name: !!body.file_name,
      has_data: !!body.data,
      data_length: body.data ? body.data.length : 0
    }));
    
    // Handle different parameter structures used in requests
    if (body.new_file && !body.data) {
      body.data = body.new_file;
    }
    
    if (!body.file_name || !body.data) {
      console.error("Missing required fields:", {
        has_file_name: !!body.file_name, 
        has_data: !!body.data
      });
      return Response.json({ 
        success: false, 
        code: 400, 
        message: "file_name and data are required" 
      });
    }
  } catch (error) {
    console.error("Error parsing request JSON:", error);
    return Response.json({ 
      success: false, 
      code: 400, 
      message: "Invalid JSON payload" 
    });
  }

  const file_name = body.file_name;
  const data = body.data;

  interface FetchIdResponse {
    id: string;
  }

  try {
    // Get file record ID
    console.log("Fetching file ID for:", file_name);
    const record = await pb
      .collection("files")
      .getFirstListItem(`file_name='${file_name}'`, { fields: "id" });
    
    const id = record.id;
    console.log("Found file ID:", id);
    
    // Get current record data
    const existingRecord = await pb.collection("files").getOne(id);
    const recordData = existingRecord.data || {};
    
    if (!recordData.versions) {
      recordData.versions = {};
    }
    
    if (!recordData.latestVersion) {
      recordData.latestVersion = 0;
    }
    
    // Increment version number
    const newVersionNumber = recordData.latestVersion + 1;
    recordData.latestVersion = newVersionNumber;
    
    // Add new version data
    recordData.versions[newVersionNumber] = data;
    
    console.log("Updating record with new version:", newVersionNumber);
    
    // Update the file record
    await pb.collection("files").update(id, {
      file_name,
      data: recordData,
    });
    
    return Response.json({
      success: true,
      code: 200,
      message: `Version ${newVersionNumber} published successfully.`,
      latestVersion: newVersionNumber,
    });
  } catch (error) {
    console.error("Error publishing new version:", error);
    return Response.json({ 
      success: false, 
      code: error && typeof error === 'object' && 'status' in error ? error.status : 500,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}