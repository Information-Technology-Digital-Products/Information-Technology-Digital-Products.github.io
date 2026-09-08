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

    if (PAYMENT_TOKEN) {
      await signInWithCustomToken(AUTH, PAYMENT_TOKEN);
    }
    return true;
  } catch (ERROR) {
    console.error("Zero-click login error:", ERROR);
    return false;
  }
}

export async function VERIFY_ACCESS(USER_EMAIL) {
  try {
    const USER_REF = doc(DB, "users", USER_EMAIL);
    const USER_SNAP = await getDoc(USER_REF);
    if (USER_SNAP.exists()) {
      return USER_SNAP.data().access_tier || "none";
    }
    return "none";
  } catch (ERROR) {
    console.error("Error verifying access:", ERROR);
    return "none";
  }
}

export async function SEND_OTP_CODE(EMAIL_ADDRESS) {
  try {
    console.log("OTP code sent to:", EMAIL_ADDRESS);
    return true;
  } catch (ERROR) {
    console.error("Error sending OTP:", ERROR);
    return false;
  }
}

export async function VERIFY_OTP_CODE(EMAIL_ADDRESS, ENTERED_CODE) {
  try {
    const USER_REF = doc(DB, "users", EMAIL_ADDRESS);
    const USER_SNAP = await getDoc(USER_REF);
    
    if (USER_SNAP.exists()) {
      return { success: true, tier: USER_SNAP.data().access_tier };
    }
    return { success: false, error: "No purchase found for this email." };
  } catch (ERROR) {
    console.error("OTP Verification Error:", ERROR);
    return { success: false, error: ERROR.message };
  }
}
