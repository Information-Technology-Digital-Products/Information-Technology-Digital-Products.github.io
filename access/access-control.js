const USER_KEY = "youomni_user";
const ACCESS_KEY = "youomni_access";

/**
 * Check login
 */
function isLoggedIn() {
  return localStorage.getItem(USER_KEY) === "true";
}

/**
 * Redirect to login if not logged in
 */
function requireAuth(redirectPath) {
  if (!isLoggedIn()) {
    window.location.href = "/login/login.html?redirect=" + redirectPath;
    return false;
  }
  return true;
}

/**
 * Get access data
 */
function getAccess() {
  const data = localStorage.getItem(ACCESS_KEY);
  return data
    ? JSON.parse(data)
    : {
        lesson1: false,
        fullCourse: false,
      };
}

/**
 * Check lesson access
 */
function hasAccess(lessonId) {
  const access = getAccess();

  if (lessonId === "index") return true;
  if (access.fullCourse) return true;
  if (lessonId === "lesson1" && access.lesson1) return true;

  return false;
}

/**
 * Main protection function
 */
function protectPage(lessonId, path) {
  // Step 1: check login
  if (!requireAuth(path)) return;

  // Step 2: check access
  if (!hasAccess(lessonId)) {
    // 🔥 CLEAN BEHAVIOR (no alert)
    window.location.href = "/login/login.html?redirect=" + path;
  }
}

/* =========================
   PURCHASE SIMULATION
========================= */

/**
 * Buy lesson1 ($9)
 */
function buyLesson1() {
  const access = getAccess();
  access.lesson1 = true;
  localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
}

/**
 * Buy full course ($199)
 */
function buyFullCourse() {
  const access = getAccess();
  access.fullCourse = true;
  access.lesson1 = true;
  localStorage.setItem(ACCESS_KEY, JSON.stringify(access));
}