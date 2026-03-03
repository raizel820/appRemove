
/**
 * GET /api/spec-templates
 * Get all active specification templates
 */

import { getSpecTemplateService } from '@/server/services/specTemplateService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as string | undefined;

    const specTemplateService = getSpecTemplateService();

    if (category) {
      const templates = await specTemplateService.getTemplatesByCategory(category);
      return NextResponse.json({
        success: true,
        category,
        templates,
        count: templates.length,
      });
    } else {
      const templates = await specTemplateService.getAllActiveTemplates();
      return NextResponse.json({
        success: true,
        templates,
        count: templates.length,
      });
    }
  } catch (error: any) {
    console.error('Error fetching spec templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch spec templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spec-templates
 * Create a new specification template
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.category || !body.fields || !Array.isArray(body.fields)) {
      return NextResponse.json(
        { error: 'Name, category, and fields array are required' },
        { status: 400 }
      );
    }

    const specTemplateService = getSpecTemplateService();
    const template = await specTemplateService.createTemplate({
      name: body.name,
      description: body.description,
      category: body.category,
      fields: body.fields,
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Spec template created successfully',
    });
  } catch (error: any) {
    console.error('Error creating spec template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create spec template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/spec-templates/[id]
 * Update a specification template
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const specTemplateService = getSpecTemplateService();
    const template = await specTemplateService.updateTemplate(params.id, {
      name: body.name,
      description: body.description,
      category: body.category,
      fields: body.fields,
      isActive: body.isActive,
    });

    return NextResponse.json({
      success: true,
      template,
      message: 'Spec template updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating spec template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update spec template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spec-templates/[id]
 * Delete a specification template
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const specTemplateService = getSpecTemplateService();
    await specTemplateService.deleteTemplate(params.id);

    return NextResponse.json({
      success: true,
      message: 'Spec template deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting spec template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete spec template' },
      { status: 500 }
    );
  }
}
