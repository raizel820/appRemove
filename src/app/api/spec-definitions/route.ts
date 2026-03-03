/**
 * GET /api/spec-definitions
 * Get all specification definitions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as string | undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (activeOnly) {
      where.isActive = true;
    }

    const specs = await db.specDefinition.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { code: 'asc' },
      ],
    });

    // Parse options JSON
    const parsedSpecs = specs.map(spec => ({
      ...spec,
      options: spec.options ? JSON.parse(spec.options) : null,
    }));

    return NextResponse.json({
      success: true,
      specs: parsedSpecs,
      count: parsedSpecs.length,
    });
  } catch (error: any) {
    console.error('Error fetching spec definitions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spec definitions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spec-definitions
 * Create a new specification definition
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const spec = await db.specDefinition.create({
      data: {
        code: body.code || null,
        type: body.type || 'number',
        unit: body.unit || null,
        labelEn: body.labelEn || null,
        labelFr: body.labelFr || null,
        labelAr: body.labelAr || null,
        descriptionEn: body.descriptionEn || null,
        descriptionFr: body.descriptionFr || null,
        descriptionAr: body.descriptionAr || null,
        category: body.category || null,
        options: body.options ? JSON.stringify(body.options) : null,
        required: body.required || false,
        minValue: body.minValue || null,
        maxValue: body.maxValue || null,
        pattern: body.pattern || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        sortOrder: body.sortOrder || 0,
      },
    });

    return NextResponse.json({
      success: true,
      spec: {
        ...spec,
        options: spec.options ? JSON.parse(spec.options) : null,
      },
      message: 'Specification created successfully',
    });
  } catch (error: any) {
    console.error('Error creating spec definition:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create spec definition' },
      { status: 500 }
    );
  }
}
