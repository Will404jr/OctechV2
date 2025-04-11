/**
 * Calculate duration in seconds between two dates
 */
export function calculateDurationInSeconds(
  startDate: Date | null,
  endDate: Date
): number {
  if (!startDate) return 0;
  return Math.round((endDate.getTime() - new Date(startDate).getTime()) / 1000);
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
}
