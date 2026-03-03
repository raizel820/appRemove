
/**
 * GET /api/machines/models/[id]
 * Get a machine model by ID
 */

import { getMachineService } from '@/server/services/machineService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machineService = getMachineService();
    const model = await machineService.getModel(params.id);

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error fetching machine model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch machine model' },
      { status: error instanceof Error && error.message === 'Machine model not found' ? 404 : 500 }
    );
  }
}

/**
 * PUT /api/machines/models/[id]
 * Update a machine model
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Filter out relation fields that shouldn't be sent in updates
    const {
      family,
      specTemplate,
      createdAt,
      updatedAt,
      ...updateData
    } = body;

    const machineService = getMachineService();
    const model = await machineService.updateModel(params.id, updateData);

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error updating machine model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update machine model' },
      { status: error instanceof Error && error.message === 'Machine model not found' ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/machines/models/[id]
 * Delete a machine model
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machineService = getMachineService();
    const model = await machineService.deleteModel(params.id);

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error deleting machine model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete machine model' },
      { status: error instanceof Error && error.message === 'Machine model not found' ? 404 : 500 }
    );
  }
}
