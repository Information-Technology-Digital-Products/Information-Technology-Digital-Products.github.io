/* access/access-control.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// 🔴 Replace with your actual Firebase config details
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  appId: "YOUR_APP_ID"
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
 * Get access configuration
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
 * Check lesson access rights
 */
export function hasAccess(lessonId) {
  const access = getAccess();

  if (lessonId === "index") return true;
  if (access.fullCourse) return true;
  if (lessonId === "lesson1" && access.lesson1) return true;

  return false;
}

/**
 * Main async protection function
 */
export async function protectPage(lessonId, path) {
  const user = await getCurrentUser();

  // Step 1: Check authentication
  if (!user) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
    return;
  }

  // Step 2: Check course access entitlement
  if (!hasAccess(lessonId)) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
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