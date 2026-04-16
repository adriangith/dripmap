import type { BrowserContext } from "@playwright/test";

/**
 * Bypass the onboarding overlay by pre-seeding the completion flag in
 * localStorage. Must be called on the context (not page) so it runs before
 * any page script — `getInitialUserData()` reads localStorage inside a
 * useState initializer, so setting it after navigation is too late.
 */
export async function bypassOnboarding(context: BrowserContext) {
  await context.addInitScript(() => {
    localStorage.setItem("dripmap-onboarding-complete", "true");
  });
}
