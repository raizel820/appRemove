/**
 * Delete Logo API
 * DELETE /api/logos/[id] - Delete a logo
 */

import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const logo = await db.companyLogo.findUnique({
      where: { id: params.id },
    });

    if (!logo) {
      return NextResponse.json(
        { error: 'Logo not found' },
        { status: 404 }
      );
    }

    // Check if this is the active logo
    const company = await db.company.findFirst();
    if (company?.activeLogoId === logo.id) {
      // Clear the active logo if we're deleting it
      await db.company.update({
        where: { id: company.id },
        data: { activeLogoId: null },
      });
    }

    // Delete the file from filesystem
    const filepath = join(process.cwd(), 'public', 'logos', logo.filename);
    try {
      await unlink(filepath);
    } catch (fsError) {
      console.warn('File not found or already deleted:', fsError);
      // Continue even if file doesn't exist
    }

    // Delete from database
    await db.companyLogo.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting logo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
