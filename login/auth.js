import { DB } from "./firebase-config.js";

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

  // Use the mocked console tier if active, otherwise fallback to lesson1
  const FINAL_TIER = window.TEST_TIER || "lesson1";

  // Store identity & tier ONLY upon successful OTP verification
  localStorage.setItem("user_email", EMAIL.toLowerCase());
  localStorage.setItem("access_tier", FINAL_TIER);

  // Clear mock state
  delete window.TEST_TIER;

  // Direct authorized user to lesson page
  window.location.href = "/lesson1/lesson1.html";
}