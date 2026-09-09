import { DB, AUTH } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let GENERATED_OTP = null;

export async function requestOTP(EMAIL) {
  if (!EMAIL || !EMAIL.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  GENERATED_OTP = Math.floor(100000 + Math.random() * 900000).toString();

  const RESPONSE = await fetch("https://youomni-github-io.vercel.app/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, otp: GENERATED_OTP })
  });

  const DATA = await RESPONSE.json();

  if (!RESPONSE.ok) {
    throw new Error(DATA.error || "Failed to send OTP.");
  }

  return true;
}

export async function verifyOTPAndLogin(EMAIL, ENTERED_OTP) {
  if (ENTERED_OTP !== GENERATED_OTP) {
    throw new Error("Invalid OTP code. Please try again.");
  }

  // Ensure anonymous session for Firestore rules
  if (!AUTH.currentUser) {
    await signInAnonymously(AUTH);
  }

  const USER_REF = doc(DB, "users", EMAIL.toLowerCase());
  const USER_SNAP = await getDoc(USER_REF);

  let TIER = "none";

  if (USER_SNAP.exists()) {
    const DATA = USER_SNAP.data();
    const RAW_TIER = DATA.access_tier || DATA.access_LEVEL || DATA.access_level || "";
    TIER = RAW_TIER.toLowerCase().replace(/_/g, "");
  } else {
    // Register basic access if new
    await setDoc(USER_REF, {
      email: EMAIL.toLowerCase(),
      access_tier: "lesson1",
      createdAt: new Date().toISOString()
    }, { merge: true });
    TIER = "lesson1";
  }

  // Store identity & access level for lesson guard
  localStorage.setItem("user_email", EMAIL.toLowerCase());
  localStorage.setItem("access_tier", TIER);

  // Direct authorized user to the lesson page
  window.location.href = "/lesson1/lesson1.html";
}