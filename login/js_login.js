export async function INIT_LESSON_GUARD(REQUIRED_TIER = "lesson1") {
  const EMAIL = localStorage.getItem("user_email");
  const CACHED_TIER = localStorage.getItem("access_tier");
  const AUTH_CONTAINER = document.getElementById("auth-header-container");

  // Inject user email and Logout button into top header
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

  // Block access if no logged-in user email exists
  if (!EMAIL) {
    window.location.href = "/login/login.html";
    return;
  }

  // Validate tier from local storage
  if (CACHED_TIER !== REQUIRED_TIER && CACHED_TIER !== "fullcourse") {
    window.location.href = "/login/login.html";
  }
}