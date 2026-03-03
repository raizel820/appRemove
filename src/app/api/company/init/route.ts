/**
 * POST /api/company/init
 * Initialize default company if none exists
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check if company exists
    const existingCompany = await db.company.findFirst();

    if (existingCompany) {
      return NextResponse.json({
        message: 'Company already exists',
        company: existingCompany,
      });
    }

    // Create default company
    const company = await db.company.create({
      data: {
        name: 'EURL LA SOURCE',
        address: '',
        phoneNumbers: '[]',
        faxNumbers: '[]',
        emails: '[]',
        currency: 'EUR',
        defaultLanguage: 'fr',
        activityDescriptionAr: '',
        activityDescriptionFr: '',
      },
    });

    return NextResponse.json({
      message: 'Default company created',
      company,
    }, { status: 201 });
  } catch (error) {
    console.error('Error initializing company:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize company' },
      { status: 500 }
    );
  }
}
