import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCompanyRepository } from '@/server/repositories/companyRepository';

// GET /api/company-profiles/[id] - Get a specific profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await db.companyProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT /api/company-profiles/[id] - Update a profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      profileNumber,
      profileName,
      nif,
      nis,
      rcn,
      rib,
      bankName,
      fundCapital,
      makeActive,
    } = body;

    const profile = await db.companyProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const companyRepository = getCompanyRepository();
    const company = await companyRepository.getCompany();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if new profile number conflicts with existing profile
    if (profileNumber !== undefined && profileNumber !== profile.profileNumber) {
      const existingProfile = await db.companyProfile.findFirst({
        where: {
          companyId: company.id,
          profileNumber: profileNumber,
          id: { not: id },
        },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Profile number already exists' },
          { status: 400 }
        );
      }
    }

    // If making this profile active, deactivate all other profiles
    if (makeActive && !profile.isActive) {
      await db.companyProfile.updateMany({
        where: { companyId: company.id, id: { not: id } },
        data: { isActive: false },
      });
    }

    // Update profile
    const updatedProfile = await db.companyProfile.update({
      where: { id },
      data: {
        ...(profileNumber !== undefined && { profileNumber }),
        ...(profileName !== undefined && { profileName }),
        ...(nif !== undefined && { nif }),
        ...(nis !== undefined && { nis }),
        ...(rcn !== undefined && { rcn }),
        ...(rib !== undefined && { rib }),
        ...(bankName !== undefined && { bankName }),
        ...(fundCapital !== undefined && { fundCapital }),
        ...(makeActive !== undefined && { isActive: makeActive }),
      },
    });

    // Update company's active profile if this one is now active
    if (makeActive) {
      await db.company.update({
        where: { id: company.id },
        data: { activeProfileId: id },
      });
    }

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/company-profiles/[id] - Delete a profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await db.companyProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const companyRepository = getCompanyRepository();
    const company = await companyRepository.getCompany();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Prevent deleting the active profile
    if (profile.isActive) {
      return NextResponse.json(
        { error: 'Cannot delete active profile. Please activate another profile first.' },
        { status: 400 }
      );
    }

    await db.companyProfile.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
