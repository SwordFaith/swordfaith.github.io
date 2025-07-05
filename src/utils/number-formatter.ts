/**
 * Number formatting utilities for display
 * Provides GitHub-style number formatting with 'k' suffix
 */

/**
 * Formats a number with 'k' suffix for values > 1000
 * Follows GitHub's display conventions:
 * - Numbers < 1000: display as-is
 * - Numbers >= 1000: display with 'k' suffix, rounded to 1 decimal place
 * - Examples: 9100 → 9.1k, 2100 → 2.1k, 1000 → 1.0k, 999 → 999
 * 
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  const thousands = num / 1000;
  
  // Round to 1 decimal place
  const rounded = Math.round(thousands * 10) / 10;
  
  // Format with 'k' suffix
  // If the decimal part is 0, don't show it (e.g., 2.0k → 2k)
  return rounded % 1 === 0 ? `${Math.floor(rounded)}k` : `${rounded}k`;
}

/**
 * Formats a number with appropriate suffix (k, M, B)
 * For larger numbers that might exceed thousands
 * 
 * @param num - The number to format
 * @returns Formatted number string
 */
export function formatLargeNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  }
  
  if (num < 1000000) {
    const thousands = num / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return rounded % 1 === 0 ? `${Math.floor(rounded)}k` : `${rounded}k`;
  }
  
  if (num < 1000000000) {
    const millions = num / 1000000;
    const rounded = Math.round(millions * 10) / 10;
    return rounded % 1 === 0 ? `${Math.floor(rounded)}M` : `${rounded}M`;
  }
  
  const billions = num / 1000000000;
  const rounded = Math.round(billions * 10) / 10;
  return rounded % 1 === 0 ? `${Math.floor(rounded)}B` : `${rounded}B`;
}