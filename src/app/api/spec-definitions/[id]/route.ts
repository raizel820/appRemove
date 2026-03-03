/**
 * API routes for individual specification definition operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * PUT /api/spec-definitions/[id]
 * Update a specification definition
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const id = params.id;

    const updateData: any = {};

    if (body.code !== undefined) updateData.code = body.code;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.labelEn !== undefined) updateData.labelEn = body.labelEn;
    if (body.labelFr !== undefined) updateData.labelFr = body.labelFr;
    if (body.labelAr !== undefined) updateData.labelAr = body.labelAr;
    if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
    if (body.descriptionFr !== undefined) updateData.descriptionFr = body.descriptionFr;
    if (body.descriptionAr !== undefined) updateData.descriptionAr = body.descriptionAr;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.options !== undefined) updateData.options = body.options ? JSON.stringify(body.options) : null;
    if (body.required !== undefined) updateData.required = body.required;
    if (body.minValue !== undefined) updateData.minValue = body.minValue;
    if (body.maxValue !== undefined) updateData.maxValue = body.maxValue;
    if (body.pattern !== undefined) updateData.pattern = body.pattern;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const spec = await db.specDefinition.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      spec: {
        ...spec,
        options: spec.options ? JSON.parse(spec.options) : null,
      },
      message: 'Specification updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating spec definition:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update spec definition' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spec-definitions/[id]
 * Delete a specification definition
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.specDefinition.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Specification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting spec definition:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete spec definition' },
      { status: 500 }
    );
  }
}
