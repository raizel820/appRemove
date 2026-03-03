/**
 * Serial Number Generator Utility
 * Format: [GLOBAL-6d]-[YYYYMM]-[MODEL_CODE][-C][v#]
 * Examples:
 *   - 000124-202601-MZ100-Cv2 (customized v2)
 *   - 000125-202601-MZ100 (stock)
 */

export interface SerialNumberOptions {
  globalCounter: number;
  year: number;
  month: number;
  modelCode: string;
  isCustomized?: boolean;
  version?: number;
}

/**
 * Format a number with leading zeros to specified width
 */
export function padNumber(num: number, width: number): string {
  return num.toString().padStart(width, '0');
}

/**
 * Generate a serial number in the canonical format
 */
export function generateSerialNumber(options: SerialNumberOptions): string {
  const { globalCounter, year, month, modelCode, isCustomized = false, version } = options;

  // Format parts
  const globalPart = padNumber(globalCounter, 6);
  const datePart = `${padNumber(year, 4)}${padNumber(month, 2)}`;
  const modelPart = modelCode.toUpperCase();

  // Build base serial number
  let serial = `${globalPart}-${datePart}-${modelPart}`;

  // Add customization suffix if applicable
  if (isCustomized) {
    const versionSuffix = version !== undefined ? `v${version}` : 'v1';
    serial = `${serial}-C${versionSuffix}`;
  }

  return serial;
}

/**
 * Parse a serial number into its components
 */
export function parseSerialNumber(serial: string): {
  globalCounter: number;
  year: number;
  month: number;
  modelCode: string;
  isCustomized: boolean;
  version?: number;
} | null {
  // Match pattern: XXXXXX-YYYYMM-MODEL[-C[v#]]
  const regex = /^(\d{6})-(\d{4})(\d{2})-([^-]+)(-C(v\d+)?)?$/;
  const match = serial.match(regex);

  if (!match) {
    return null;
  }

  const [, globalPart, yearPart, monthPart, modelPart, customSuffix, versionPart] = match;

  return {
    globalCounter: parseInt(globalPart, 10),
    year: parseInt(yearPart, 10),
    month: parseInt(monthPart, 10),
    modelCode: modelPart,
    isCustomized: !!customSuffix,
    version: versionPart ? parseInt(versionPart.replace('v', ''), 10) : undefined,
  };
}

/**
 * Validate a serial number format
 */
export function validateSerialNumber(serial: string): boolean {
  return parseSerialNumber(serial) !== null;
}

/**
 * Generate the next serial number for a given model
 */
export function generateNextSerialNumber(
  lastGlobalCounter: number,
  modelCode: string,
  isCustomized?: boolean,
  version?: number
): string {
  const now = new Date();
  return generateSerialNumber({
    globalCounter: lastGlobalCounter + 1,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    modelCode,
    isCustomized,
    version,
  });
}
