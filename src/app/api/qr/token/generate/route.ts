import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateVerificationToken } from '@/lib/hashedTokenUtil';
import type { FileVerificationData } from '@/lib/hashedTokenUtil';

/**
 * POST /api/qr/token/generate
 * Generate and save a verification token to the database
 * If label is "test", delete any existing test token before creating a new one
 */
export async function POST(request: NextRequest) {
  try {
    const { verificationData, qrJsonData, label } = await request.json();

    if (!verificationData || !qrJsonData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: verificationData and qrJsonData' },
        { status: 400 }
      );
    }

    // If this is a test token, delete any existing test token
    if (label === 'test') {
      await db.verificationToken.deleteMany({
        where: { label: 'test' }
      });
    }

    // Generate the verification token
    const token = generateVerificationToken(verificationData);

    // Save to database
    const savedToken = await db.verificationToken.create({
      data: {
        token,
        qrJsonData: JSON.stringify(qrJsonData),
        label: label || null,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        token: savedToken.token,
        label: savedToken.label,
        createdAt: savedToken.createdAt,
      }
    });
  } catch (error) {
    console.error('Error generating verification token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate verification token' },
      { status: 500 }
    );
  }
}
