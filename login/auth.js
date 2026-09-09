import { AUTH, DB } from "./firebase-config.js";
import { 
  signInWithCustomToken, 
  signInAnonymously,
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Handle silent authentication upon post-payment redirect
export async function HANDLE_ZERO_CLICK_LOGIN(PAYMENT_TOKEN, USER_EMAIL, ACCESS_TIER) {
  try {
    const USER_REF = doc(DB, "users", USER_EMAIL);
    const USER_SNAP = await getDoc(USER_REF);

    if (!USER_SNAP.exists()) {
      await setDoc(USER_REF, {
        email: USER_EMAIL,
        access_tier: ACCESS_TIER,
        created_at: new Date().toISOString()
      });
    } else if (ACCESS_TIER === "full_course") {
      await updateDoc(USER_REF, { access_tier: "full_course" });
    }

    localStorage.setItem("user_email", USER_EMAIL);

    if (PAYMENT_TOKEN) {
      await signInWithCustomToken(AUTH, PAYMENT_TOKEN);
    } else {
      await signInAnonymously(AUTH);
    }
    return true;
  } catch (ERROR) {
    console.error("Zero-click login error:", ERROR);
    return false;
  }
}

// Verify a user's access tier from Firestore using UID or Email
export async function VERIFY_ACCESS(USER_IDENTIFIER, USER_EMAIL = null) {
  try {
    let USER_REF = doc(DB, "users", USER_IDENTIFIER);
    let USER_SNAP = await getDoc(USER_REF);

    // Fallback to searching by email if UID document is not found
    if (!USER_SNAP.exists() && USER_EMAIL) {
      USER_REF = doc(DB, "users", USER_EMAIL);
      USER_SNAP = await getDoc(USER_REF);
    }

    if (USER_SNAP.exists()) {
      return USER_SNAP.data().access_tier || USER_SNAP.data().access_LEVEL || "none";
    }
    return "none";
  } catch (ERROR) {
    console.error("Error verifying access:", ERROR);
    return "none";
  }
}

// Send OTP simulation 
export async function SEND_OTP_CODE(EMAIL_ADDRESS) {
  try {
    // Generate a random 6-digit code
    const GENERATED_OTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Store generated OTP in memory for verification step
    sessionStorage.setItem("pending_otp", GENERATED_OTP);

    const RESPONSE = await fetch('https://youomni-github-io.vercel.app/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL_ADDRESS,
        otpCode: GENERATED_OTP
      })
    });

    const RESULT = await RESPONSE.json();
    return RESULT.success || false;
  } catch (ERROR) {
    console.error("Error sending OTP:", ERROR);
    return false;
  }
}

// Verify OTP simulation
export async function VERIFY_OTP_CODE(EMAIL_ADDRESS, ENTERED_CODE) {
  try {
    const USER_REF = doc(DB, "users", EMAIL_ADDRESS);
    const USER_SNAP = await getDoc(USER_REF);
    
    if (USER_SNAP.exists()) {
      // Store verified email in localStorage to persist across navigation
      localStorage.setItem("user_email", EMAIL_ADDRESS);
      
      // Sign into Firebase Auth session
      if (!AUTH.currentUser) {
        await signInAnonymously(AUTH);
      }

      return { success: true, tier: USER_SNAP.data().access_tier || USER_SNAP.data().access_LEVEL };
    }
    return { success: false, error: "No purchase found for this email." };
  } catch (ERROR) {
    console.error("OTP Verification Error:", ERROR);
    return { success: false, error: ERROR.message };
  }
}

// Guard protected pages and render the top-right header button
export function INIT_LESSON_GUARD(REQUIRED_TIER = "lesson1") {
  onAuthStateChanged(AUTH, async (CURRENT_USER) => {
    const CONTAINER = document.getElementById("auth-header-container");
    const STORED_EMAIL = localStorage.getItem("user_email");

    // Check if user has no session AND no saved email
    if (!CURRENT_USER && !STORED_EMAIL) {
      if (CONTAINER) {
        CONTAINER.innerHTML = `
          <a href="/login/login.html" style="padding: 8px 16px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">Login</a>
        `;
      }
      window.location.href = "/login/login.html";
      return;
    }

    // Use current user's UID/Email or fallback to stored email from login
    const USER_IDENTIFIER = CURRENT_USER ? CURRENT_USER.uid : STORED_EMAIL;
    const USER_EMAIL = CURRENT_USER?.email || STORED_EMAIL;

    // Verify access tier in Firestore
    const USER_TIER = await VERIFY_ACCESS(USER_IDENTIFIER, USER_EMAIL);
    const HAS_ACCESS = USER_TIER === "full_course" || USER_TIER === REQUIRED_TIER;

    if (!HAS_ACCESS) {
      alert("Access denied. Please purchase access to view this lesson.");
      window.location.href = "/login/login.html";
      return;
    }

    // Render user header info and Logout button
    if (CONTAINER) {
      CONTAINER.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 14px;">${USER_EMAIL || "Logged in"}</span>
          <button id="auth-logout-btn" style="padding: 8px 16px; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Logout</button>
        </div>
      `;

      document.getElementById("auth-logout-btn").addEventListener("click", async () => {
        localStorage.removeItem("user_email");
        sessionStorage.clear();
        await signOut(AUTH);
        window.location.href = "/login/login.html";
      });
    }
  });
}