export async function handlePaymentCheckout(EMAIL) {
  if (!EMAIL || !EMAIL.includes("@")) {
    alert("Please enter a valid email address first.");
    return;
  }

  localStorage.setItem("user_email", EMAIL.toLowerCase());

  // Direct payment handling logic or Stripe link redirect
  window.location.href = "https://checkout.stripe.com/YOUR_PAYMENT_LINK?prefilled_email=" + encodeURIComponent(EMAIL);
}