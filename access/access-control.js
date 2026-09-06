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

  // Index (Trial Lesson) is open to everyone
  if (lessonId === "index") return true;

  // Option 2 & 3: Full course grants access to all 20 lessons
  if (access.fullCourse) return true;

  // Option 1: Lesson 1 purchase grants access only to lesson 1
  if (lessonId === "lesson1" && access.lesson1) return true;

  return false;
}

/**
 * Returns the price for upgrading to the full course based on purchase history
 */
export function getUpgradePrice() {
  const access = getAccess();

  if (access.fullCourse) return 0;   // Already owns all 20 lessons
  if (access.lesson1) return 190;    // Option 3: Upgrade price ($199 - $9 = $190)
  return 199;                        // Option 2: Full price upfront
}

/**
 * Page protection guard
 */
export async function protectPage(lessonId, path) {
  const user = await getCurrentUser();

  // 1. Check if user is logged in
  if (!user) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
    return;
  }

  // 2. Check if user has paid access for this lesson
  if (!hasAccess(lessonId)) {
    window.location.href = "/login/login.html?redirect=" + encodeURIComponent(path);
  }
}

/**
 * Logout helper
 */
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "/login/login.html";
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