
/**
 * Machine Models API (Updated with Spec Templates)
 * Full CRUD for machine models with spec template references
 */

import { getMachineService } from '@/server/services/machineService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const familyId = url.searchParams.get('familyId') as string | undefined;
    const search = url.searchParams.get('search') as string | undefined;

    const machineService = getMachineService();
    const models = await machineService.getModels(familyId, search);

    return NextResponse.json(models);
  } catch (error: any) {
    console.error('Error fetching machine models:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch machine models' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const machineService = getMachineService();
    const model = await machineService.createModel({
      familyId: body.familyId,
      name: body.name,
      code: body.code,
      description: body.description,
      basePrice: body.basePrice ? parseFloat(body.basePrice) : undefined,
      currency: body.currency || undefined,
      specTemplateId: body.specTemplateId,
      isManufactured: body.isManufactured ?? true,
      mechanicalSpecs: body.mechanicalSpecs ?? undefined,
      electricalSpecs: body.electricalSpecs ?? undefined,
      physicalSpecs: body.physicalSpecs ?? undefined,
    });

    return NextResponse.json({
      success: true,
      model,
    });
  } catch (error: any) {
    console.error('Error creating machine model:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create machine model' },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Filter out relation fields that shouldn't be sent in updates
    const {
      id,
      family,
      specTemplate,
      createdAt,
      updatedAt,
      ...updateData
    } = body;

    const machineService = getMachineService();
    const updated = await machineService.updateModel(id, {
      ...updateData,
      basePrice: updateData.basePrice ? parseFloat(updateData.basePrice) : undefined,
      currency: updateData.currency,
    });

    return NextResponse.json({
      success: true,
      model: updated,
    });
  } catch (error: any) {
    console.error('Error updating machine model:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update machine model' },
      { status: 500 }
    );
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machineService = getMachineService();
    await machineService.deleteModel(params.id);

    return NextResponse.json({
      success: true,
      message: 'Machine model deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting machine model:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete machine model' },
      { status: 500 }
    );
  }
}
