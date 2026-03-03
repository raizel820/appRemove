/**
 * Order Number Formatter Utility
 * Format: 003/2026 (sequence/year)
 */

export interface OrderNumberOptions {
  year: number;
  sequence: number;
}

/**
 * Generate formatted order number: 003/2026
 */
export function formatOrderNumber(options: OrderNumberOptions): string {
  const { year, sequence } = options;
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `${paddedSequence}/${year}`;
}

/**
 * Parse an order number
 */
export function parseOrderNumber(orderNumber: string): { year: number; sequence: number } | null {
  const match = orderNumber.match(/^(\d{3})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    sequence: parseInt(match[1], 10),
    year: parseInt(match[2], 10),
  };
}

/**
 * Validate an order number format
 */
export function validateOrderNumber(orderNumber: string): boolean {
  return parseOrderNumber(orderNumber) !== null;
}

/**
 * Calculate the next sequence number for a given year
 */
export function getNextSequenceNumber(lastSequence: number): number {
  return lastSequence + 1;
}

/**
 * Format a date for filenames: YYYYMMDD
 */
export function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}
