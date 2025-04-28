// Enhanced search API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const caseSensitive = searchParams.get("caseSensitive") === "true";
  const matchExactPhrase = searchParams.get("matchExactPhrase") === "true";

  // Validate required parameters
  if (!query) {
    return Response.json(
      { success: false, message: "Missing required parameter: 'query'" },
      { status: 400 }
    );
  }

  // Validate query length
  if (query.length > 500) {
    return Response.json(
      {
        success: false,
        message: "Query parameter is too long, must be under 500 characters",
      },
      { status: 400 }
    );
  }

  // Fetch all files metadata and content
  try {
    const res = await fetch("https://database.acroford.com/files", {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return Response.json(
        { success: false, message: "Failed to fetch files" },
        { status: res.status }
      );
    }

    const files = await res.json();

    // Helper to normalize text for case-insensitive search
    const normalize = (text: string) =>
      caseSensitive ? text : text.toLowerCase();
    const normQuery = normalize(query);

    // Search logic
    const results: Array<{
      file_name: string;
      id: string;
      matches: Array<{ type: "name" | "content"; snippet?: string }>;
    }> = [];

    // Prepare all content fetches in parallel
    try {
      const fileContents = await Promise.all(
        files.map(async (file: { file_name: string; id: string }) => {
          try {
            // Fetch file content
            const contentRes = await fetch(
              `https://database.acroford.com/files/${file.id}`,
              {
                headers: { Accept: "application/json" },
              }
            );

            if (!contentRes.ok) return { ...file, content: "" };

            const data = await contentRes.json();
            return { ...file, content: data.content || "" };
          } catch (error) {
            console.error(
              `Error fetching content for file ${file.file_name}:`,
              error
            );
            return { ...file, content: "" };
          }
        })
      );

      for (const file of fileContents) {
        const matches: Array<{ type: "name" | "content"; snippet?: string }> =
          [];

        // Search in file name
        const fileNameNorm = normalize(file.file_name);
        if (
          (matchExactPhrase && fileNameNorm === normQuery) ||
          (!matchExactPhrase && fileNameNorm.includes(normQuery))
        ) {
          matches.push({ type: "name" });
        }

        // Search in file content
        const contentNorm = normalize(file.content);
        let foundInContent = false;

        if (matchExactPhrase) {
          if (contentNorm.includes(normQuery)) {
            foundInContent = true;
            // Provide a snippet
            const idx = contentNorm.indexOf(normQuery);
            const snippet = file.content.substring(
              Math.max(0, idx - 30),
              Math.min(file.content.length, idx + normQuery.length + 30)
            );
            matches.push({ type: "content", snippet });
          }
        } else {
          if (contentNorm.includes(normQuery)) {
            foundInContent = true;
            const idx = contentNorm.indexOf(normQuery);
            const snippet = file.content.substring(
              Math.max(0, idx - 30),
              Math.min(file.content.length, idx + normQuery.length + 30)
            );
            matches.push({ type: "content", snippet });
          }
        }

        // If no matches and matchExactPhrase is false, try loose word search
        if (matches.length === 0 && !matchExactPhrase) {
          const words = normQuery.split(/\s+/).filter(Boolean);
          let allWordsFound = words.every(
            (word) => fileNameNorm.includes(word) || contentNorm.includes(word)
          );
          if (allWordsFound) {
            // Find snippets for each word in content
            for (const word of words) {
              if (contentNorm.includes(word)) {
                const idx = contentNorm.indexOf(word);
                const snippet = file.content.substring(
                  Math.max(0, idx - 30),
                  Math.min(file.content.length, idx + word.length + 30)
                );
                matches.push({ type: "content", snippet });
              }
              if (fileNameNorm.includes(word)) {
                matches.push({ type: "name" });
              }
            }
          }
        }

        if (matches.length > 0) {
          results.push({
            file_name: file.file_name,
            id: file.id,
            matches,
          });
        }
      }

      return Response.json({
        success: true,
        query,
        caseSensitive,
        matchExactPhrase,
        count: results.length,
        results,
      });
    } catch (error) {
      console.error("Error processing search results:", error);
      return Response.json(
        { success: false, message: "Error processing search results" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    return Response.json(
      { success: false, message: "Error fetching files" },
      { status: 500 }
    );
  }
}