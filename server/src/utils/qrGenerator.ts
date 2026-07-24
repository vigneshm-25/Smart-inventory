/**
 * Utility placeholder for item identification.
 */
export function formatItemCode(num: number): string {
  return `ITM-${String(num).padStart(3, '0')}`;
}
