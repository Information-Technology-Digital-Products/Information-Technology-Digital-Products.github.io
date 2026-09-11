import { DB, AUTH } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let GENERATED_OTP = null;
const GOOGLE_PROVIDER = new GoogleAuthProvider();

// Helper to resolve the effective email (explicit test email vs user input)
function getEffectiveEmail(INPUT_EMAIL) {
  return (window.TEST_PURCHASE_EMAIL || INPUT_EMAIL || "").toLowerCase().trim();
}

export async function requestOTP(EMAIL) {
  const TARGET_EMAIL = getEffectiveEmail(EMAIL);

  if (!TARGET_EMAIL || !TARGET_EMAIL.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  GENERATED_OTP = Math.floor(100000 + Math.random() * 900000).toString();

  const RESPONSE = await fetch("https://youomni-github-io.vercel.app/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TARGET_EMAIL, otp: GENERATED_OTP })
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

  const TARGET_EMAIL = getEffectiveEmail(EMAIL);
  const FINAL_TIER = window.TEST_TIER || "lesson1";

  localStorage.setItem("user_email", TARGET_EMAIL);
  localStorage.setItem("access_tier", FINAL_TIER);

  // Clean up global test overrides
  delete window.TEST_TIER;
  delete window.TEST_PURCHASE_EMAIL;

  window.location.href = "/lesson1/lesson1.html";
}

export async function loginWithGoogle() {
  try {
    const RESULT = await signInWithPopup(AUTH, GOOGLE_PROVIDER);
    const USER = RESULT.user;
    
    // Override with test email if explicitly set during testing
    const TARGET_EMAIL = window.TEST_PURCHASE_EMAIL ? window.TEST_PURCHASE_EMAIL.toLowerCase() : USER.email.toLowerCase();
    const FINAL_TIER = window.TEST_TIER || "lesson1";

    localStorage.setItem("user_email", TARGET_EMAIL);
    localStorage.setItem("access_tier", FINAL_TIER);

    delete window.TEST_TIER;
    delete window.TEST_PURCHASE_EMAIL;

    window.location.href = "/lesson1/lesson1.html";
  } catch (ERR) {
    throw new Error(ERR.message || "Google sign-in failed.");
  }
}