import type { FitBlurbs, Constraints } from "./types";

/**
 * Build a short paragraph from the fit blurbs that match the user's
 * active preference dimensions (excluding distance & familiarity).
 * Returns null if no blurbs match.
 */
export function buildFitParagraph(
  fit: FitBlurbs | undefined,
  constraints: Constraints | null,
): string | null {
  if (!fit || !constraints) return null;

  const parts: string[] = [];

  if (constraints.cost !== "any" && fit.cost) parts.push(fit.cost);

  if (constraints.duration !== "any" && fit.duration) {
    if (typeof fit.duration === "string") {
      parts.push(fit.duration);
    } else {
      const blurb = fit.duration[constraints.duration];
      if (blurb) parts.push(blurb);
    }
  }

  if (constraints.group && fit.group) parts.push(fit.group);
  if ((constraints.date || constraints.timeOfDay) && fit.date) parts.push(fit.date);

  if (parts.length === 0) return null;
  return parts.join(" ");
}
