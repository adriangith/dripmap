/**
 * Format a duration in seconds as a human-readable drive time.
 * Rounds to nearest 5 minutes, minimum "~5 min".
 */
export function formatDriveTime(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const rounded = Math.max(5, Math.round(totalMin / 5) * 5);

  if (rounded < 60) {
    return `~${rounded} min`;
  }

  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (mins === 0) {
    return `~${hrs} hr`;
  }
  return `~${hrs} hr ${mins} min`;
}
