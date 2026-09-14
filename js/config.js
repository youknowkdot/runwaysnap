/**
 * RunwaySnap configuration
 *
 * SELLER SETUP (required before selling Pro):
 *   1. Create a $19 one-time product on Gumroad or Lemon Squeezy
 *   2. Replace YOUR_CHECKOUT_URL below with the real product / checkout link
 *   3. Rebuild (`npm run build`) and redeploy
 *
 * Until then, Buy Pro opens this placeholder and the UI warns that checkout
 * is not configured. Demo unlock (RUNWAY-PRO / ?pro=1) still works for testing.
 */
window.RUNWAYSNAP_CONFIG = {
  // ⚠️ PLACEHOLDER — replace with your Gumroad or Lemon Squeezy URL before selling
  YOUR_CHECKOUT_URL: "https://kdotknows.gumroad.com/l/evzmb",

  PRICE: "$19",
  PRICE_NOTE: "one-time",
  DEMO_CODE: "RUNWAY-PRO",
  STORAGE_KEYS: {
    inputs: "runwaysnap_inputs",
    pro: "runwaysnap_pro",
    scenarios: "runwaysnap_scenarios",
  },

  /** True when YOUR_CHECKOUT_URL still looks like the example placeholder */
  isCheckoutPlaceholder() {
    const u = String(this.YOUR_CHECKOUT_URL || "");
    return (
      !u ||
      u.includes("YOUR_CHECKOUT_URL") ||
      u.includes("example/runwaysnap") ||
      u === "#"
    );
  },
};
