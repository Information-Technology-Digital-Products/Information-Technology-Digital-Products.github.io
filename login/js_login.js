import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID"
};

let DB = null;
try {
  const APP = initializeApp(FIREBASE_CONFIG);
  DB = getFirestore(APP);
} catch (E) {
  console.warn("Firebase initialization skipped (placeholder config).");
}

export async function INIT_LESSON_GUARD(REQUIRED_TIER = "lesson1") {
  const EMAIL = localStorage.getItem("user_email");
  const CACHED_TIER = localStorage.getItem("access_tier");
  const AUTH_CONTAINER = document.getElementById("auth-header-container");

  // Inject user email and Logout button into header
  if (AUTH_CONTAINER) {
    if (EMAIL) {
      AUTH_CONTAINER.innerHTML = `
        <span style="margin-right: 10px; color: #cbd5e1;">${EMAIL}</span>
        <button id="logout-btn" style="padding: 5px 12px; cursor: pointer;">Logout</button>
      `;
      document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("user_email");
        localStorage.removeItem("access_tier");
        window.location.href = "/login/login.html";
      });
    } else {
      AUTH_CONTAINER.innerHTML = `
        <a href="/login/login.html" style="color: #38bdf8; text-decoration: none; font-weight: bold;">Login</a>
      `;
    }
  }

  // Redirect if no email is saved in session
  if (!EMAIL) {
    window.location.href = "/login/login.html";
    return;
  }

  // Check Firestore permissions if configured, otherwise rely on local cached tier
  if (DB) {
    try {
      const USER_SNAP = await getDoc(doc(DB, "users", EMAIL));
      if (USER_SNAP.exists()) {
        const DATA = USER_SNAP.data();
        const RAW_TIER = DATA.access_tier || DATA.access_LEVEL || DATA.access_level || "";
        const TIER = RAW_TIER.toLowerCase().replace(/_/g, "");

        if (TIER !== REQUIRED_TIER && TIER !== "fullcourse") {
          window.location.href = "/login/login.html";
          return;
        }
      }
    } catch (E) {
      console.warn("Firestore lookup bypassed, utilizing local session tier.");
    }
  }

  // Local tier validation fallback
  if (CACHED_TIER !== REQUIRED_TIER && CACHED_TIER !== "fullcourse") {
    window.location.href = "/login/login.html";
  }
}