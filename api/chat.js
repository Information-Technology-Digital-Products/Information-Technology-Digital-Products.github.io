export default async function handler(REQ, RES) {
  // Enable CORS
  RES.setHeader("Access-Control-Allow-Origin", "*");
  RES.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  RES.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (REQ.method === "OPTIONS") {
    RES.status(200).end();
    return;
  }

  const API_KEY = process.env.GOOGLE_DOC;

  if (!API_KEY) {
    RES.status(500).json({ error: "Missing GOOGLE_DOC API key." });
    return;
  }

  RES.status(200).json({ token: API_KEY });
}