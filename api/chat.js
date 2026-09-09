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
    RES.status(500).json({ error: "Missing GOOGLE_DOC API key in environment variables." });
    return;
  }

  try {
    const EXPIRE_TIME = new Date(Date.now() + 300 * 1000).toISOString();

    const RESPONSE = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          config: {
            uses: 1,
            expireTime: EXPIRE_TIME,
            targetModel: "models/gemini-3.1-flash-live-preview",
            allowedMethods: ["bidiGenerateContent"]
          }
        })
      }
    );

    const DATA = await RESPONSE.json();

    if (!RESPONSE.ok) {
      console.error("Gemini API Error:", DATA);
      RES.status(RESPONSE.status).json({ error: DATA.error?.message || "Failed to create token" });
      return;
    }

    const TOKEN_VALUE = DATA.name || DATA.value || DATA.token;

    RES.status(200).json({ token: TOKEN_VALUE });
  } catch (ERR) {
    console.error("Token generation error:", ERR);
    RES.status(500).json({ error: ERR.message || "Failed to generate token" });
  }
}