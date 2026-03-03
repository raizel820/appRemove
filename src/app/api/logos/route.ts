/**
 * List All Company Logos API
 * GET /api/logos - Get all uploaded company logos
 * POST /api/logos - Upload new company logos
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Allowed file types for logos
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Helper function to generate a unique filename
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  return `${timestamp}_${randomStr}_${baseName}${ext}`;
}

/**
 * GET /api/logos - Get all uploaded company logos
 */
export async function GET(request: NextRequest) {
  try {
    // Get company and its logos
    const company = await db.company.findFirst({
      include: {
        logos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ logos: [] });
    }

    return NextResponse.json({
      companyId: company.id,
      activeLogoId: company.activeLogoId,
      logos: company.logos.map(logo => ({
        id: logo.id,
        filename: logo.filename,
        originalName: logo.originalName,
        fileType: logo.fileType,
        fileSize: logo.fileSize,
        isActive: logo.isActive,
        createdAt: logo.createdAt,
        url: `/logos/${logo.filename}`,
      })),
    });
  } catch (error) {
    console.error('Error fetching logos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logos - Upload new company logos
 */
export async function POST(request: NextRequest) {
  try {
    // Get company
    const company = await db.company.findFirst();

    if (!company) {
      return NextResponse.json(
        { error: 'No company found. Please create a company profile first.' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Ensure logos directory exists
    const logosDir = path.join(process.cwd(), 'public', 'logos');
    if (!existsSync(logosDir)) {
      await mkdir(logosDir, { recursive: true });
    }

    // Validate and process each file
    const uploadedLogos: Array<{
      id: string;
      filename: string;
      originalName: string;
      url: string;
    }> = [];

    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large. Maximum size: 5MB`);
        continue;
      }

      // Generate unique filename
      const filename = generateFilename(file.name);
      const filePath = path.join(logosDir, filename);

      // Save file to disk
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create database record
      const logo = await db.companyLogo.create({
        data: {
          companyId: company.id,
          filename,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          isActive: false, // Don't auto-activate new logos
        },
      });

      uploadedLogos.push({
        id: logo.id,
        filename: logo.filename,
        originalName: logo.originalName,
        url: `/logos/${logo.filename}`,
      });
    }

    // Return response
    if (uploadedLogos.length === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded', errors },
        { status: 400 }
      );
    }

    const message = errors.length > 0
      ? `${uploadedLogos.length} logo(s) uploaded successfully. ${errors.length} file(s) skipped.`
      : `${uploadedLogos.length} logo(s) uploaded successfully.`;

    return NextResponse.json({
      message,
      uploaded: uploadedLogos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error uploading logos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logos' },
      { status: 500 }
    );
  }
}
