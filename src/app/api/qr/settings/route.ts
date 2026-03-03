import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import type { QRCodeConfig } from '@/lib/qrCodeUtils';

// Create a new PrismaClient instance for this route
const prisma = new PrismaClient();

/**
 * GET /api/qr/settings
 * Retrieve QR code settings from database
 */
export async function GET() {
  try {
    // Try to get settings from database
    const settings = await prisma.qRCodeSettings.findFirst();

    if (settings) {
      return NextResponse.json({
        success: true,
        data: JSON.parse(settings.config) as QRCodeConfig,
      });
    }

    // Return default config if no settings found
    const { defaultQRCodeConfig } = await import('@/lib/qrCodeUtils');
    return NextResponse.json({
      success: true,
      data: defaultQRCodeConfig,
    });
  } catch (error) {
    console.error('Error fetching QR code settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch QR code settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qr/settings
 * Save QR code settings to database
 */
export async function POST(request: NextRequest) {
  try {
    const config = (await request.json()) as QRCodeConfig;

    // Validate config
    const { validateQRCodeConfig } = await import('@/lib/qrCodeUtils');
    if (!validateQRCodeConfig(config)) {
      return NextResponse.json(
        { success: false, error: 'Invalid QR code configuration' },
        { status: 400 }
      );
    }

    // Check if settings already exist
    const existingSettings = await prisma.qRCodeSettings.findFirst();

    if (existingSettings) {
      // Update existing settings
      await prisma.qRCodeSettings.update({
        where: { id: existingSettings.id },
        data: { config: JSON.stringify(config) },
      });
    } else {
      // Create new settings
      await prisma.qRCodeSettings.create({
        data: { config: JSON.stringify(config) },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'QR code settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving QR code settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save QR code settings' },
      { status: 500 }
    );
  }
}
