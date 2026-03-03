import crypto from 'crypto';

export interface FileVerificationData {
  fileNumber: string;
  fileType: string;
  date: string;
  totalAmount: number;
  companyName: string;
  customerName: string;
  timestamp?: string; // Optional timestamp for unique token generation
}

/**
 * Generate a hashed verification token for file verification
 * @param data - File data to include in the hash
 * @param secretKey - Secret key for HMAC (should be stored in environment variables)
 * @returns Hashed verification token
 */
export function generateVerificationToken(
  data: FileVerificationData,
  secretKey: string = process.env.VERIFICATION_SECRET || 'default-secret-key-change-in-production'
): string {
  // Automatically add timestamp if not provided to ensure unique tokens
  const dataWithTimestamp = {
    ...data,
    timestamp: data.timestamp || new Date().toISOString(),
  };

  const dataString = JSON.stringify(dataWithTimestamp, Object.keys(dataWithTimestamp).sort());
  return crypto
    .createHmac('sha256', secretKey)
    .update(dataString)
    .digest('hex');
}

/**
 * Verify a hashed token against file data
 * @param token - The hashed token to verify
 * @param data - File data to verify against
 * @param secretKey - Secret key used for HMAC
 * @returns True if token is valid, false otherwise
 */
export function verifyToken(
  token: string,
  data: FileVerificationData,
  secretKey: string = process.env.VERIFICATION_SECRET || 'default-secret-key-change-in-production'
): boolean {
  // Generate token with same data (will auto-add timestamp)
  const computedToken = generateVerificationToken(data, secretKey);
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(computedToken, 'hex')
  );
}

/**
 * Verify if a token exists and is valid (without requiring exact data)
 * This is useful when tokens are stored in a database with their data
 * @param token - The hashed token to verify
 * @param storedData - The stored data that was used to generate the token
 * @param secretKey - Secret key used for HMAC
 * @returns True if token is valid, false otherwise
 */
export function verifyTokenWithStoredData(
  token: string,
  storedData: FileVerificationData,
  secretKey: string = process.env.VERIFICATION_SECRET || 'default-secret-key-change-in-production'
): boolean {
  // Generate token with the stored data (which includes the original timestamp)
  const computedToken = generateVerificationToken(storedData, secretKey);
  return crypto.timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(computedToken, 'hex')
  );
}

/**
 * Decode and verify a verification token, returning the file info
 * @param token - The verification token to decode
 * @param secretKey - Secret key for verification
 * @returns File verification data if valid, null otherwise
 */
export function decodeVerificationToken(
  token: string,
  secretKey: string = process.env.VERIFICATION_SECRET || 'default-secret-key-change-in-production'
): FileVerificationData | null {
  try {
    // Note: Since we're using HMAC, the token itself doesn't contain the data
    // In a real implementation, you might want to use JWT or signed JSON
    // For now, this is a placeholder that would need to be implemented based on how you store/retrieve file data
    return null;
  } catch (error) {
    console.error('Error decoding verification token:', error);
    return null;
  }
}

/**
 * Generate a verification URL that includes the token
 * @param token - The verification token
 * @param baseUrl - Base URL for verification
 * @returns Full verification URL
 */
export function generateVerificationUrl(
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'
): string {
  return `${baseUrl}/verify?token=${token}`;
}
