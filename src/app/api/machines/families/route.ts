
/**
 * Machine Families API (Updated with Spec Templates)
 */

import { getMachineService } from '@/server/services/machineService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') as string | undefined;

    const machineService = getMachineService();
    const families = await machineService.getFamilies(search);

    return NextResponse.json(families);
  } catch (error: any) {
    console.error('Error fetching machine families:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch machine families' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const machineService = getMachineService();
    const family = await machineService.createFamily({
      name: body.name,
      description: body.description,
      code: body.code,
      modelSpecs: body.modelSpecs || false,
    });

    return NextResponse.json({
      success: true,
      family,
      message: 'Machine family created successfully',
    });
  } catch (error: any) {
    console.error('Error creating machine family:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create machine family' },
      { status: 500 }
    );
  }
}
