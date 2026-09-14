/**
 * RunwaySnap configuration
 *
 * Checkout: Gumroad product link for Pro ($19 one-time).
 * Demo unlock (RUNWAY-PRO / ?pro=1) remains available for demos and testing.
 */
window.RUNWAYSNAP_CONFIG = {
  YOUR_CHECKOUT_URL: "https://kdotknows.gumroad.com/l/evzmb",

  PRICE: "$19",
  PRICE_NOTE: "one-time",
  DEMO_CODE: "RUNWAY-PRO",
  STORAGE_KEYS: {
    inputs: "runwaysnap_inputs",
    pro: "runwaysnap_pro",
    scenarios: "runwaysnap_scenarios",
  },

  /** True when checkout URL is missing or still an unresolved placeholder */
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
