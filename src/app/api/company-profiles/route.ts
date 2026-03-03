import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCompanyRepository } from '@/server/repositories/companyRepository';

// GET /api/company-profiles - Get all company profiles
export async function GET() {
  try {
    const companyRepository = getCompanyRepository();
    const company = await companyRepository.getCompany();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const profiles = await db.companyProfile.findMany({
      where: { companyId: company.id },
      orderBy: [
        { isActive: 'desc' },
        { profileNumber: 'asc' },
      ],
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('Error fetching company profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company profiles' },
      { status: 500 }
    );
  }
}

// POST /api/company-profiles - Create a new company profile
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!profileName) {
      return NextResponse.json(
        { error: 'Profile name is required' },
        { status: 400 }
      );
    }

    const companyRepository = getCompanyRepository();
    const company = await companyRepository.getCompany();
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if profile number already exists for this company
    if (profileNumber !== undefined) {
      const existingProfile = await db.companyProfile.findFirst({
        where: {
          companyId: company.id,
          profileNumber: profileNumber,
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
    if (makeActive) {
      await db.companyProfile.updateMany({
        where: { companyId: company.id },
        data: { isActive: false },
      });
    }

    // Create new profile
    const newProfile = await db.companyProfile.create({
      data: {
        companyId: company.id,
        profileNumber: profileNumber ?? 1,
        profileName,
        nif: nif || null,
        nis: nis || null,
        rcn: rcn || null,
        rib: rib || null,
        bankName: bankName || null,
        fundCapital: fundCapital || null,
        isActive: makeActive ?? false,
      },
    });

    // If this is the first profile or was made active, update company's active profile
    if (makeActive) {
      await db.company.update({
        where: { id: company.id },
        data: { activeProfileId: newProfile.id },
      });
    } else if (!company.activeProfileId) {
      // If company has no active profile, set this one as active
      await db.companyProfile.update({
        where: { id: newProfile.id },
        data: { isActive: true },
      });
      await db.company.update({
        where: { id: company.id },
        data: { activeProfileId: newProfile.id },
      });
    }

    return NextResponse.json(newProfile, { status: 201 });
  } catch (error) {
    console.error('Error creating company profile:', error);
    return NextResponse.json(
      { error: 'Failed to create company profile' },
      { status: 500 }
    );
  }
}
