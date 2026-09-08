import { HANDLE_ZERO_CLICK_LOGIN } from "./auth.js";

export function INITIALIZE_PADDLE(VENDOR_ID) {
  if (window.Paddle) {
    window.Paddle.Setup({ vendor: VENDOR_ID });
  }
}

export function OPEN_CHECKOUT(PASSED_PASSTHROUGH, PRODUCT_ID) {
  if (!window.Paddle) return;
  
  window.Paddle.Checkout.open({
    product: PRODUCT_ID,
    passthrough: JSON.stringify(PASSED_PASSTHROUGH),
    successCallback: async function(DATA) {
      const USER_EMAIL = DATA.user.email;
      const IS_FULL = PRODUCT_ID === "FULL_COURSE_PRODUCT_ID" || PRODUCT_ID === "UPSELL_PRODUCT_ID";
      const TIER_SET = IS_FULL ? "full_course" : "lesson_1";
      
      await HANDLE_ZERO_CLICK_LOGIN(null, USER_EMAIL, TIER_SET);
      window.location.reload();
    }
  });
}
