import { DB, AUTH } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let GENERATED_OTP = null;
const GOOGLE_PROVIDER = new GoogleAuthProvider();

export async function requestOTP(EMAIL) {
  if (!EMAIL || !EMAIL.includes("@")) {
    throw new Error("Enter your Purchase Email");
  }

  GENERATED_OTP = Math.floor(100000 + Math.random() * 900000).toString();

  const RESPONSE = await fetch("https://youomni-github-io.vercel.app/api/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, otp: GENERATED_OTP })
  });

  const DATA = await RESPONSE.json();

  if (!RESPONSE.ok) {
    throw new Error(DATA.error || "Failed to send Login Code");
  }

  return true;
}

export async function verifyOTPAndLogin(EMAIL, ENTERED_OTP) {
  if (ENTERED_OTP !== GENERATED_OTP) {
    throw new Error("Invalid Login Code");
  }

  const FINAL_TIER = window.TEST_TIER || "lesson1";

  localStorage.setItem("user_email", EMAIL.toLowerCase());
  localStorage.setItem("access_tier", FINAL_TIER);

  delete window.TEST_TIER;

  window.location.href = "/lesson1/lesson1.html";
}

export async function loginWithGoogle() {
  try {
    const RESULT = await signInWithPopup(AUTH, GOOGLE_PROVIDER);
    const USER = RESULT.user;
    const EMAIL = USER.email.toLowerCase();

    const FINAL_TIER = window.TEST_TIER || "lesson1";

    localStorage.setItem("user_email", EMAIL);
    localStorage.setItem("access_tier", FINAL_TIER);

    delete window.TEST_TIER;

    window.location.href = "/lesson1/lesson1.html";
  } catch (ERR) {
    throw new Error(ERR.message || "Google sign-in failed");
  }
}