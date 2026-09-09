import { AUTH, DB } from "./firebase-config.js";
import { 
  signInWithCustomToken, 
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
    const NORMALIZED_EMAIL = USER_EMAIL.trim().toLowerCase();
    const USER_REF = doc(DB, "users", NORMALIZED_EMAIL);
    const USER_SNAP = await getDoc(USER_REF);

    if (!USER_SNAP.exists()) {
      await setDoc(USER_REF, {
        email: NORMALIZED_EMAIL,
        access_tier: ACCESS_TIER,
        created_at: new Date().toISOString()
      });
    } else if (ACCESS_TIER === "full_course") {
      await updateDoc(USER_REF, { access_tier: "full_course" });
    }

    localStorage.setItem("user_email", NORMALIZED_EMAIL);

    if (PAYMENT_TOKEN) {
      await signInWithCustomToken(AUTH, PAYMENT_TOKEN);
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
    let USER_SNAP = null;

    if (USER_IDENTIFIER) {
      const USER_REF = doc(DB, "users", USER_IDENTIFIER);
      USER_SNAP = await getDoc(USER_REF);
    }

    // Fallback to searching by email if UID document is not found
    if ((!USER_SNAP || !USER_SNAP.exists()) && USER_EMAIL) {
      const EMAIL_REF = doc(DB, "users", USER_EMAIL.trim().toLowerCase());
      USER_SNAP = await getDoc(EMAIL_REF);
    }

    if (USER_SNAP && USER_SNAP.exists()) {
      const RAW_TIER = USER_SNAP.data().access_tier || USER_SNAP.data().access_LEVEL || "none";
      // Normalize tier string (e.g. "lesson_1" -> "lesson1")
      return RAW_TIER.toString().toLowerCase().replace(/_/g, "");
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
    const GENERATED_OTP = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem("pending_otp", GENERATED_OTP);

    const RESPONSE = await fetch('https://youomni-github-io.vercel.app/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL_ADDRESS.trim().toLowerCase(),
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
    const NORMALIZED_EMAIL = EMAIL_ADDRESS.trim().toLowerCase();
    const USER_REF = doc(DB, "users", NORMALIZED_EMAIL);
    const USER_SNAP = await getDoc(USER_REF);
    
    if (USER_SNAP.exists()) {
      localStorage.setItem("user_email", NORMALIZED_EMAIL);
      return { 
        success: true, 
        tier: USER_SNAP.data().access_tier || USER_SNAP.data().access_LEVEL 
      };
    }
    return { success: false, error: "No purchase found for this email." };
  } catch (ERROR) {
    console.error("OTP Verification Error:", ERROR);
    return { success: false, error: ERROR.message };
  }
}

// Guard protected pages and render the top-right header button
export function INIT_LESSON_GUARD(REQUIRED_TIER = "lesson1") {
  const NORMALIZED_REQUIRED = REQUIRED_TIER.toString().toLowerCase().replace(/_/g, "");

  onAuthStateChanged(AUTH, async (CURRENT_USER) => {
    const CONTAINER = document.getElementById("auth-header-container");
    const STORED_EMAIL = localStorage.getItem("user_email");

    if (!CURRENT_USER && !STORED_EMAIL) {
      if (CONTAINER) {
        CONTAINER.innerHTML = `
          <a href="/login/login.html" style="padding: 8px 16px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px;">Login</a>
        `;
      }
      window.location.href = "/login/login.html";
      return;
    }

    const USER_IDENTIFIER = CURRENT_USER ? CURRENT_USER.uid : null;
    const USER_EMAIL = CURRENT_USER?.email || STORED_EMAIL;

    const USER_TIER = await VERIFY_ACCESS(USER_IDENTIFIER, USER_EMAIL);

    const HAS_ACCESS = USER_TIER === "fullcourse" || USER_TIER === NORMALIZED_REQUIRED;

    if (!HAS_ACCESS) {
      alert("Access denied. Please purchase access to view this lesson.");
      window.location.href = "/login/login.html";
      return;
    }

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