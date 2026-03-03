
/**
 * GET /api/company
 * Get company settings (enhanced with French identifiers and active profile data)
 */

import { getCompanyService } from "@/server/services/companyService";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const companyService = getCompanyService();
    const company = await companyService.getCompany();

    // If no company exists, create default with French defaults
    if (!company) {
      const defaultCompany = await companyService.ensureCompany();
      return NextResponse.json(defaultCompany);
    }

    // Fetch active profile if it exists
    let activeProfile = null;
    if (company.activeProfileId) {
      activeProfile = await db.companyProfile.findUnique({
        where: { id: company.activeProfileId },
      });
    }

    // If no active profile but profiles exist, use the first one
    if (!activeProfile) {
      const firstProfile = await db.companyProfile.findFirst({
        where: { companyId: company.id },
        orderBy: { profileNumber: 'asc' },
      });
      if (firstProfile) {
        activeProfile = firstProfile;
      }
    }

    // Merge active profile data into company response
    // This ensures PDF preview utilities continue to work without modification
    const companyWithActiveProfile = {
      ...company,
      // Use active profile's data if available, otherwise fall back to company-level fields
      nif: activeProfile?.nif ?? company.nif,
      nis: activeProfile?.nis ?? company.nis,
      rcn: activeProfile?.rcn ?? company.rcn,
      rib: activeProfile?.rib ?? company.rib,
      bankName: activeProfile?.bankName ?? company.bankName,
      fundCapital: activeProfile?.fundCapital ?? company.fundCapital,
      // Activity descriptions remain at company level (not per-profile)
      activityDescriptionAr: company.activityDescriptionAr,
      activityDescriptionFr: company.activityDescriptionFr,
      activeProfileId: activeProfile?.id ?? null,
      activeProfile: activeProfile ? {
        id: activeProfile.id,
        profileNumber: activeProfile.profileNumber,
        profileName: activeProfile.profileName,
        isActive: activeProfile.isActive,
      } : null,
      logos: company.logos?.map(logo => ({
        id: logo.id,
        filename: logo.filename,
        originalName: logo.originalName,
        fileType: logo.fileType,
        fileSize: logo.fileSize,
        isActive: logo.isActive,
        createdAt: logo.createdAt,
        url: `/logos/${logo.filename}`,
      })) || [],
    };

    return NextResponse.json(companyWithActiveProfile);
  } catch (error: any) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch company' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/company
 * Update company settings (with French identifiers and currency conversion for fund capital)
 */

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const companyService = getCompanyService();

    // Filter out non-updatable fields (logos, id, createdAt, updatedAt, activeProfile)
    const {
      logos,
      id,
      createdAt,
      updatedAt,
      activeProfile, // This is a computed field, not a database field
      ...updateData
    } = body

    // Update company with filtered data
    await companyService.updateCompany(updateData);

    return NextResponse.json({
      success: true,
      message: 'Company settings updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update company' },
      { status: 500 }
    );
  }
}
