// Looks up a passage from the ESV API, keeping the API token on the server.
// Expects a POST with a JSON body like {"q": "John 3:16"}.

const ESV_URL = "https://api.esv.org/v3/passage/text/"

const PARAMS = {
  "include-passage-references": true,
  "include-first-verse-numbers": true,
  "include-verse-numbers": false,
  "include-footnotes": false,
  "include-headings": false,
  "include-heading-horizontal-lines": false,
  "include-passage-horizontal-lines": false,
  "include-short-copyright": true,
  "include-selahs": true,
  "indent-using": "space",
  "indent-paragraphs": 2,
  "indent-poetry": true,
  "indent-poetry-lines": 4,
  "line-length": 0,
}

export default async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
  }

  const { q } = await request.json().catch(() => ({}))
  if (typeof q !== "string" || !q.trim() || q.length > 200) {
    return Response.json({ error: "Expected a JSON body like {\"q\": \"John 3:16\"}" }, { status: 400 })
  }

  const url = new URL(ESV_URL)
  for (const [key, value] of Object.entries({ ...PARAMS, q })) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    headers: { Authorization: `Token ${process.env.ESV_API_AUTHORIZATION_TOKEN}` },
  })

  if (!response.ok) {
    console.error("ESV API error", response.status, await response.text())
    return Response.json({ error: "Passage lookup failed" }, { status: 502 })
  }

  return Response.json(await response.json())
}

export const config = { path: "/api/text" }
