
/**
 * GET /api/machines/families/[id]
 * Get a machine family by ID
 */

import { getMachineService } from '@/server/services/machineService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const machineService = getMachineService();
    const family = await machineService.getFamily(params.id);

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error fetching machine family:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch machine family' },
      { status: error instanceof Error && error.message === 'Machine family not found' ? 404 : 500 }
    );
  }
}

/**
 * PUT /api/machines/families/[id]
 * Update a machine family
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Filter out relation fields that shouldn't be sent in updates
    const {
      models,
      createdAt,
      updatedAt,
      ...updateData
    } = body;

    const machineService = getMachineService();
    const family = await machineService.updateFamily(params.id, updateData);

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error updating machine family:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update machine family' },
      { status: error instanceof Error && error.message === 'Machine family not found' ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/machines/families/[id]
 * Delete a machine family with optional cascade delete of models
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const deleteModels = body.deleteModels === true;

    const machineService = getMachineService();
    const family = await machineService.deleteFamily(params.id, deleteModels);

    return NextResponse.json(family);
  } catch (error) {
    console.error('Error deleting machine family:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete machine family' },
      { status: error instanceof Error && error.message === 'Machine family not found' ? 404 : 500 }
    );
  }
}
