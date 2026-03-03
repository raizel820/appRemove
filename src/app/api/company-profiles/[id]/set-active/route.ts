import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCompanyRepository } from '@/server/repositories/companyRepository';

// PUT /api/company-profiles/[id]/set-active - Set a profile as active
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await db.companyProfile.findUnique({
      where: { id: params.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const companyRepository = getCompanyRepository();
    const company = await companyRepository.getCompany();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Deactivate all other profiles for this company
    await db.companyProfile.updateMany({
      where: { companyId: company.id, id: { not: params.id } },
      data: { isActive: false },
    });

    // Activate this profile
    const updatedProfile = await db.companyProfile.update({
      where: { id: params.id },
      data: { isActive: true },
    });

    // Update company's active profile
    await db.company.update({
      where: { id: company.id },
      data: { activeProfileId: params.id },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error setting active profile:', error);
    return NextResponse.json(
      { error: 'Failed to set active profile' },
      { status: 500 }
    );
  }
}
