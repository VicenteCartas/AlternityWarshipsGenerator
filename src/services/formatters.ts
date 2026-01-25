/**
 * Shared formatting utility functions
 */

/**
 * Format a cost number for display
 * @param cost - Cost in credits
 * @returns Formatted string like "$350 K", "$1.5 M", "$2 B"
 */
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '-';
  }
  if (cost >= 1_000_000_000) {
    const value = cost / 1_000_000_000;
    // Use decimal only if needed
    return value % 1 === 0 ? `$${value} B` : `$${value.toFixed(1)} B`;
  } else if (cost >= 1_000_000) {
    const value = cost / 1_000_000;
    return value % 1 === 0 ? `$${value} M` : `$${value.toFixed(1)} M`;
  } else if (cost >= 1_000) {
    const value = cost / 1_000;
    return value % 1 === 0 ? `$${value} K` : `$${value.toFixed(1)} K`;
  }
  return `$${cost}`;
}

/**
 * Format target modifier number as display string
 * @param modifier - The target modifier value (positive = easier to hit, negative = harder)
 * @returns Formatted string like "+3 steps", "-1 step", "0"
 */
export function formatTargetModifier(modifier: number): string {
  if (modifier === 0) {
    return '0';
  }
  const sign = modifier > 0 ? '+' : '';
  const stepWord = Math.abs(modifier) === 1 ? 'step' : 'steps';
  return `${sign}${modifier} ${stepWord}`;
}
