import PocketBase from "pocketbase";

const pb = new PocketBase(`${process.env.POCKETBASE_SERVER_URL}`);

export async function POST(request: Request) {
  let user_inputs;
  let file_name;
  try {
    ({ user_inputs, file_name } = await request.json());
    if (!user_inputs || !file_name) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "user_inputs and file_name are required",
        }),
        { status: 400 }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid JSON payload" }),
      { status: 400 }
    );
  }

  console.log();
  console.log();
  console.log("SUBFUNCTION HAS BEEN CALLED -> IMPLEMENT EDITS");
  console.log();

  // Define verbose with optional properties for debugging
  const verbose: {
    timestamp: string;
    route: string;
    inputs: { user_inputs: any; file_name: any };
    overview?: any; // Make overview optional
    newVersionContent?: string; // Make newVersionContent optional
    error?: string; // Make error optional
  } = {
    timestamp: new Date().toISOString(),
    route: "implement_edits",
    inputs: { user_inputs, file_name },
  };

  let overview: string | undefined;
  let file_contents: { data: string } | undefined;

  // get an overview
  try {
    const overviewResponse = await fetch(
      "http://localhost:3000/api/v2/models/getOverview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: user_inputs,
          file_name: file_name,
        }),
      }
    );

    if (!overviewResponse.ok) {
      const errorText = await overviewResponse.text();
      console.error(`Failed to get overview: ${errorText}`);
      throw new Error(
        `Overview API returned status ${overviewResponse.status}: ${errorText}`
      );
    }

    const overviewData = await overviewResponse.json();
    overview = overviewData.prompt; // Correctly extract the 'prompt' which contains the overview
    file_contents = { data: overviewData.file_contents }; // Correctly extract 'file_contents'
  } catch (error) {
    console.error("Error getting overview:", error);
    verbose.error = error instanceof Error ? error.message : String(error);
    // Return an error response
    return Response.json(
      {
        success: false,
        message:
          "Failed to generate an implementation plan: " +
          (error instanceof Error ? error.message : String(error)),
        verbose: verbose, // Include verbose data
      },
      { status: 500 }
    );
  }

  // At this point, overview and file_contents are guaranteed to be defined and have the correct types
  // because of the check and the catch block above.

  console.log("GENERATED OVERVIEW / IMPLEMENTATION PLAN");
  console.log("Overview: ", overview);

  // implement the overview
  try {
    const implementOverviewResponse = await fetch(
      "http://localhost:3000/api/v2/models/implementOverview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overview: overview, 
          file_contents: file_contents.data,
          file_name: file_name,
        }),
        signal: AbortSignal.timeout(1500000), // Add 25-minute timeout
      }
    );

    // Check response first
    if (!implementOverviewResponse.ok) {
      // Try to parse JSON error first
      let errorMessage = "Unknown implementOverview error";
      try {
        const errorData = await implementOverviewResponse.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, try text
        try {
          errorMessage = await implementOverviewResponse.text();
        } catch (e2) {
          // If text extraction fails, use status
          errorMessage = `Status ${implementOverviewResponse.status}: ${implementOverviewResponse.statusText}`;
        }
      }
      throw new Error(`Failed to implement overview: ${errorMessage}`);
    }

    // Parse the response
    const implementOverviewJson = await implementOverviewResponse.json();
    console.log("implementOverview response:", JSON.stringify(implementOverviewJson, null, 2));

    // Validate newVersion more thoroughly with proper error handling
    if (!implementOverviewJson || typeof implementOverviewJson !== 'object') {
      throw new Error('implementOverview returned non-object response');
    }
    
    if (!('newVersion' in implementOverviewJson)) {
      throw new Error('implementOverview response missing newVersion field');
    }
    
    if (typeof implementOverviewJson.newVersion !== 'string') {
      throw new Error(`implementOverview returned newVersion of type ${typeof implementOverviewJson.newVersion} instead of string`);
    }
    
    if (implementOverviewJson.newVersion.length < 100) {
      throw new Error('implementOverview returned suspiciously short newVersion');
    }

    // Once validated, extract the content
    const newVersionContent = implementOverviewJson.newVersion;

    // --- PocketBase Update Logic ---
    console.log("Fetching file ID for:", file_name);
    const record = await pb
      .collection("files")
      .getFirstListItem(`file_name='${file_name}'`, { fields: "id, data" }); // Fetch data too

    const id = record.id;
    console.log("Found file ID:", id);

    const recordData = record.data || {}; // Use existing data

    if (!recordData.versions) {
      recordData.versions = {};
    }

    // Ensure latestVersion is a number, default to 0 if missing/invalid
    let currentVersion = typeof recordData.latestVersion === 'number' ? recordData.latestVersion : 0;

    // Increment version number
    const newVersionNumber = currentVersion + 1;
    recordData.latestVersion = newVersionNumber;

    // Add new version data
    recordData.versions[newVersionNumber] = newVersionContent; // Store the new content

    console.log("Updating record with new version:", newVersionNumber);

    // Update the file record in PocketBase
    await pb.collection("files").update(id, {
      data: recordData, // Update the whole data object
    });
    // --- End PocketBase Update Logic ---


    verbose.overview = overview; // Add overview to verbose data
    verbose.newVersionContent = newVersionContent; // Add new content for debugging if needed

    console.log("IMPLEMENTED OVERVIEW");
    return Response.json({
      success: true,
      overview: overview, // Keep sending the overview back
      message:
        "Display the overview of what was implemented to the user in a message, without changing it at all. The edits have successfully been made to the file",
      file_name: file_name,
      latestVersion: newVersionNumber, // Return the new latest version number
      verbose: verbose, // Add verbose data to response
    });
  } catch (error) {
    console.error("Error implementing overview or updating PocketBase:", error); // Updated error log
    verbose.error = error instanceof Error ? error.message : String(error); // Log error details
    return Response.json(
      {
        success: false,
        message:
          "Successfully generated an implementation plan, but was unable to implement it or save it: " +
          (error instanceof Error ? error.message : String(error)),
        verbose: verbose, // Include verbose data even on error
      },
      { status: 500 } // Use 500 for server-side errors
    );
  }
}