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

  const verbose = {
    timestamp: new Date().toISOString(),
    route: "implement_edits",
    inputs: { user_inputs, file_name },
  };

  let overview;

  // get an overview
  try {
    overview = await fetch(
      "http://localhost:3000/api/generative/get_overview",
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
    ).then((res) => res.json());
  } catch (error) {
    // Return an error response
    return Response.json({
      success: false,
      message:
        "Failed to generate an implementation plan, let alone implemenent it",
    });
  }

  console.log("GENERATED OVERVIEW / IMPLEMENTATION PLAN");
  console.log("Overview: ", overview);

  // implement that overview

  try {
    const implemented_overview = await fetch(
      "http://localhost:3000/api/generative/implement_overview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          overview: overview.prompt,
          file_name: file_name,
        }),
      }
    );
    const implemenent_overview_json = await implemented_overview.json();
    const latestVersion = implemenent_overview_json.latestVersion;

    console.log("IMPLEMENTED OVERVIEW");
    console.log("Implementation: ", implemented_overview);
    return Response.json({
      success: true,
      overview: overview,
      message:
        "Display the overview of what was implemented to the user in a message, without changing it at all. The edits have successfully been made to the file",
      file_name: file_name,
      latestVersion: latestVersion,
      verbose: verbose, // Add verbose data to response
    });
  } catch (error) {
    return Response.json({
      success: false,
      message:
        "Successfully generated an implementation plan, but was unable to implemenent it",
    });
  }
}