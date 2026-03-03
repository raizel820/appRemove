/**
 * Set Active Logo API
 * PUT /api/logos/[id]/set-active - Set a logo as the active/default logo
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await db.company.findFirst();

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const logo = await db.companyLogo.findUnique({
      where: { id: params.id },
    });

    if (!logo) {
      return NextResponse.json(
        { error: 'Logo not found' },
        { status: 404 }
      );
    }

    if (logo.companyId !== company.id) {
      return NextResponse.json(
        { error: 'Logo does not belong to this company' },
        { status: 400 }
      );
    }

    // Deactivate all logos for this company
    await db.companyLogo.updateMany({
      where: { companyId: company.id },
      data: { isActive: false },
    });

    // Set the selected logo as active
    await db.companyLogo.update({
      where: { id: params.id },
      data: { isActive: true },
    });

    // Update company's activeLogoId
    await db.company.update({
      where: { id: company.id },
      data: { activeLogoId: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Logo set as active successfully',
      logo: {
        id: logo.id,
        filename: logo.filename,
        url: `/logos/${logo.filename}`,
      },
    });
  } catch (error) {
    console.error('Error setting active logo:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set active logo' },
      { status: 500 }
    );
  }
}
