import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithCustomToken, 
  signOut 
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
// Replace with your production backend URL (e.g., Render, Fly.io, Railway)
const BACKEND_URL = "https://your-backend-domain.com";

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export function getLocalAccess() {
  const data = localStorage.getItem(ACCESS_KEY);
  return data
    ? JSON.parse(data)
    : {
        lesson1: false,
        fullCourse: false,
      };
}

export async function hasAccess(lessonId) {
  if (lessonId === "index") return true;

  const user = await getCurrentUser();
  if (user) {
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.fullCourse) return true;
  }

  const localAccess = getLocalAccess();
  if (localAccess.fullCourse) return true;
  if (lessonId === "lesson1" && localAccess.lesson1) return true;

  return false;
}

export async function protectPage(lessonId, path) {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");

  // 1. Process instant access token if coming directly from Stripe payment
  if (sessionId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-checkout?session_id=${encodeURIComponent(sessionId)}`);
      const data = await response.json();

      if (data.token) {
        // Log in to Firebase automatically via Custom Token
        await signInWithCustomToken(auth, data.token);

        // Store local session fallback
        const access = getLocalAccess();
        access.fullCourse = true;
        access.lesson1 = true;
        localStorage.setItem(ACCESS_KEY, JSON.stringify(access));

        // Clean up URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    } catch (error) {
      console.error("Failed to verify instant access session:", error);
    }
  }

  // 2. Standard page access evaluation
  const accessGranted = await hasAccess(lessonId);
  if (!accessGranted) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
  }
}

export async function logoutUser() {
  localStorage.removeItem(ACCESS_KEY);
  await signOut(auth);
  window.location.href = "/index.html";
}

export async function renderAuthHeader(containerId = "auth-header") {
  const user = await getCurrentUser();
  const container = document.getElementById(containerId);

  if (!container) return;

  const accessGranted = await hasAccess("fullCourse");

  if (user || accessGranted) {
    const emailDisplay = user?.email || "Purchased Access";
    container.innerHTML = `
      <div style="position: fixed; top: 16px; right: 16px; display: flex; align-items: center; gap: 12px; background: rgba(28, 28, 28, 0.9); padding: 8px 14px; border-radius: 20px; border: 1px solid #333; z-index: 9999; font-family: Arial, sans-serif; font-size: 14px; color: #fff;">
        <span style="opacity: 0.9; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${emailDisplay}</span>
        <button id="global-logout-btn" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px;">Log Out</button>
      </div>
    `;

    document.getElementById("global-logout-btn").addEventListener("click", async () => {
      await logoutUser();
    });
  } else {
    container.innerHTML = "";
  }
}