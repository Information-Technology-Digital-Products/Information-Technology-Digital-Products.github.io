/* access/access-control.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithCustomToken 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwXP9KUEUdiu0836CE20HCX-lBrGmiqjI",
  authDomain: "youomni-7d0d6.firebaseapp.com",
  projectId: "youomni-7d0d6",
  storageBucket: "youomni-7d0d6.firebasestorage.app",
  messagingSenderId: "604663505682",
  appId: "1:604663505682:web:4132d3f7f5c908b31409cb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const ACCESS_KEY = "youomni_access";
const BACKEND_URL = "http://localhost:8080"; // Change to your live production server URL when deployed

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function getAccess() {
  const data = localStorage.getItem(ACCESS_KEY);
  return data
    ? JSON.parse(data)
    : {
        lesson1: false,
        fullCourse: false,
      };
}

export function hasAccess(lessonId) {
  const access = getAccess();

  if (lessonId === "index") return true;
  if (access.fullCourse) return true;
  if (lessonId === "lesson1" && access.lesson1) return true;

  return false;
}

export async function protectPage(lessonId, path) {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  // 1. Zero-Click Post-Purchase Auto-Login via Stripe Session ID
  if (sessionId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`);
      const data = await response.json();

      if (data.success && data.firebaseToken) {
        // Authenticate user in Firebase seamlessly
        await signInWithCustomToken(auth, data.firebaseToken);

        // Provision local access wristband
        const access = getAccess();
        access.fullCourse = true;
        access.lesson1 = true;
        localStorage.setItem(ACCESS_KEY, JSON.stringify(access));

        // Clean query parameters from browser URL bar
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    } catch (error) {
      console.error("Payment verification error:", error);
    }
  }

  // 2. Standard access check for returning or existing visitors
  if (!hasAccess(lessonId)) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
  }
}

export async function logoutUser() {
  localStorage.removeItem(ACCESS_KEY);
  await signOut(auth);
  window.location.href = "/index.html";
}

export async function renderAuthHeader(containerId = "auth-header", showLoginWhenLoggedOut = false) {
  const user = await getCurrentUser();
  const container = document.getElementById(containerId);

  if (!container) return;

  if (user || hasAccess("lesson1")) {
    const emailDisplay = user?.email || "Access Active";
    container.innerHTML = `
      <div style="position: fixed; top: 16px; right: 16px; display: flex; align-items: center; gap: 12px; background: rgba(28, 28, 28, 0.9); padding: 8px 14px; border-radius: 20px; border: 1px solid #333; z-index: 9999; font-family: Arial, sans-serif; font-size: 14px; color: #fff;">
        <span style="opacity: 0.9; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${emailDisplay}</span>
        <button id="global-logout-btn" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px;">Log Out</button>
      </div>
    `;

    document.getElementById("global-logout-btn").addEventListener("click", async () => {
      await logoutUser();
    });
  } else if (showLoginWhenLoggedOut) {
    container.innerHTML = `
      <div style="position: fixed; top: 16px; right: 16px; z-index: 9999; font-family: Arial, sans-serif;">
        <a href="/login/login.html" style="background: #4a90e2; color: white; text-decoration: none; padding: 8px 16px; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">Log In</a>
      </div>
    `;
  } else {
    container.innerHTML = "";
  }
}