export default async function handler(REQ, RES) {
  // Enable CORS for your GitHub Pages origin
  RES.setHeader("Access-Control-Allow-Origin", "*");
  RES.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  RES.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (REQ.method === "OPTIONS") {
    RES.status(200).end();
    return;
  }

  const API_KEY = process.env.GOOGLE_DOC;

  if (!API_KEY) {
    RES.status(500).json({ error: "Missing GOOGLE_DOC API key in environment variables." });
    return;
  }

  // Return the key directly to establish the WebSocket connection
  RES.status(200).json({ token: API_KEY });
}