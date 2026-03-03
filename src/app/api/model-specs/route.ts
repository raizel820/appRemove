/**
 * Model Specs API
 * Manage specifications attached to machine models
 */

import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET: Fetch specs for a specific model
export async function GET(request: NextRequest) {
  try {
    const modelId = request.nextUrl.searchParams.get('modelId');

    if (!modelId) {
      return NextResponse.json(
        { error: 'modelId is required' },
        { status: 400 }
      );
    }

    const modelSpecs = await (db as any).modelSpec.findMany({
      where: { modelId },
      include: {
        specDefinition: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ specs: modelSpecs });
  } catch (error: any) {
    console.error('Error fetching model specs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch model specs' },
      { status: 500 }
    );
  }
}

// POST: Create or update model specs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelId, specs } = body;

    if (!modelId || !Array.isArray(specs)) {
      return NextResponse.json(
        { error: 'modelId and specs array are required' },
        { status: 400 }
      );
    }

    // Delete existing specs for this model
    await (db as any).modelSpec.deleteMany({
      where: { modelId },
    });

    // Create new specs
    const createdSpecs = await Promise.all(
      specs.map((spec: any, index: number) =>
        (db as any).modelSpec.create({
          data: {
            modelId,
            specDefinitionId: spec.specDefinitionId,
            value: spec.value || null,
            sortOrder: index,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      specs: createdSpecs,
    });
  } catch (error: any) {
    console.error('Error saving model specs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save model specs' },
      { status: 500 }
    );
  }
}
