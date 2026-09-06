/* access/access-control.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDynBXFEWiPQn1ggxgzCsSocnHPXCOnhd8",
  authDomain: "youomni-7e3b8.firebaseapp.com",
  projectId: "youomni-7e3b8",
  storageBucket: "youomni-7e3b8.firebasestorage.app",
  messagingSenderId: "349979735697",
  appId: "1:349979735697:web:aa49de6fdd07b40cdff130",
  measurementId: "G-C1GVBRZZN3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const ACCESS_KEY = "youomni_access";

/**
 * Returns a Promise that resolves with the current authenticated Firebase user.
 */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Get current access configuration from storage
 */
export function getAccess() {
  const data = localStorage.getItem(ACCESS_KEY);
  return data
    ? JSON.parse(data)
    : {
        lesson1: false,
        fullCourse: false,
      };
}

/**
 * Check access rights for any given lesson
 */
export function hasAccess(lessonId) {
  const access = getAccess();

  if (lessonId === "index") return true;
  if (access.fullCourse) return true;
  if (lessonId === "lesson1" && access.lesson1) return true;

  return false;
}

/**
 * Dynamic price calculator for full course upgrade
 */
export function getUpgradePrice() {
  const access = getAccess();

  if (access.fullCourse) return 0;
  if (access.lesson1) return 190;
  return 199;
}

/**
 * Page protection guard
 */
export async function protectPage(lessonId, path) {
  const user = await getCurrentUser();

  // 1. If NOT logged in -> Redirect to Login Page
  if (!user) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
    return;
  }

  // 2. If logged in BUT HAS NOT PAID -> Redirect to Main Page (https://youomni.github.io)
  if (!hasAccess(lessonId)) {
    window.location.href = "https://youomni.github.io";
  }
}

/**
 * Logout current user and stay on the current page
 */
export async function logoutUser() {
  await signOut(auth);
  // Reload current page to update state without forcing a redirect to login.html
  window.location.reload();
}

/**
 * Renders the top-right authentication component showing email and logout button.
 * Only displays when the user is logged in.
 */
export async function renderAuthHeader(containerId = "auth-header") {
  const user = await getCurrentUser();
  const container = document.getElementById(containerId);

  if (!container) return;

  if (user) {
    const emailDisplay = user.email || user.displayName || "Logged In";
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
    // Leave container empty when logged out
    container.innerHTML = "";
  }
}

/**
 * Purchase Simulation Actions
 */
export function buyLesson1() {
  const access = getAccess();
  access.lesson1 = true;
  localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
}

export function buyFullCourse() {
  const access = getAccess();
  access.fullCourse = true;
  access.lesson1 = true;
  localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
}