import { GoogleGenAI, Modality } from "@google/genai";
import { WebSocketServer } from "ws";
import express from "express";
import http from "http";
import cors from "cors";
import Stripe from "stripe";
import admin from "firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "youomni-7d0d6",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// API Endpoint: Validate Stripe Checkout Session & Return Custom Auth Token
app.get("/api/verify-checkout", async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ success: false, error: "Missing session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      const email = session.customer_details?.email || session.customer_email;

      if (!email) {
        return res.status(400).json({ success: false, error: "No customer email found" });
      }

      // Find or create Firebase user
      let user;
      try {
        user = await admin.auth().getUserByEmail(email);
      } catch (e) {
        user = await admin.auth().createUser({ email });
      }

      // Generate custom token for frontend auto-login
      const firebaseToken = await admin.auth().createCustomToken(user.uid, { fullCourse: true });

      return res.json({ success: true, firebaseToken, email });
    } else {
      return res.status(400).json({ success: false, error: "Payment pending or unpaid" });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE });
  let liveSession = null;

  (async () => {
    try {
      liveSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: {
            parts: [
              {
                text: `You are an AI tutor teaching a student using the provided course material.`,
              },
            ],
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
              endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
            },
          },
        },
        callbacks: {
          onmessage: (message) => {
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify(message));
            }
          },
          onerror: (err) => {
            console.error("Gemini Live error:", err);
          },
        },
      });
    } catch (e) {
      console.error("Connection failed:", e);
    }
  })();

  ws.on("message", (data) => {
    if (liveSession) {
      liveSession.sendRealtimeInput({
        audio: {
          data: data.toString(),
          mimeType: "audio/pcm;rate=16000",
        },
      });
    }
  });

  ws.on("close", () => {
    if (liveSession) liveSession.close();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});