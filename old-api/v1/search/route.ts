import axios from "axios";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

function cleanSearchResults(items: any[]): SearchResult[] {
  return items.map((item) => ({
    title: item.title || "",
    link: item.link || "",
    snippet: item.snippet || "",
  }));
}

async function search(
  searchItem: string,
  apiKey: string,
  cseId: string,
  searchDepth: number = 10,
  siteFilter?: string
): Promise<SearchResult[]> {
  const serviceUrl = "https://www.googleapis.com/customsearch/v1";

  const params = {
    q: searchItem,
    key: apiKey,
    cx: cseId,
    num: searchDepth.toString(),
  };

  try {
    const response = await axios.get(serviceUrl, { params });
    const results = response.data;

    if (results.items) {
      const cleanedResults = cleanSearchResults(results.items);
      if (siteFilter) {
        return cleanedResults.filter((result) =>
          result.link.includes(siteFilter)
        );
      }
      return cleanedResults;
    } else {
      console.log("No search results found.");
      return [];
    }
  } catch (error) {
    console.error(`An error occurred during the search: ${error}`);
    return [];
  }
}

export async function GET(request: Request) {
  // Extract query parameters from request params
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("query");
  if (!rawQuery) {
    return new Response("Query parameter is required", { status: 400 });
  }
  const searchItem = decodeURIComponent(rawQuery).trim();
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID; // Assuming you have stored your CSE ID in an environment variable

  console.log('API Key:', key ? 'Present' : 'Missing');
  console.log('CSE ID:', cx ? 'Present' : 'Missing');

  if (!searchItem || !key || !cx) {
    return new Response(
      "Missing required query parameters or environment variables",
      { status: 400 }
    );
  }

  return search(searchItem, key, cx)
    .then((results) => new Response(JSON.stringify(results), { status: 200 }))
    .catch(
      (error) =>
        new Response(`An error occurred: ${error.message}`, { status: 500 })
    );
}