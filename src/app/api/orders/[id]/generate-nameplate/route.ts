
/**
 * POST /api/orders/[id]/generate-nameplate
 * Generate machine nameplate for an order
 */

import { getOrderService } from '@/server/services/orderService';
import { getPDFService } from '@/server/services/pdfService';
import { getDocumentTemplateGenerator, DocumentData } from '@/server/services/documentTemplateGenerator';
import { getCompanyService } from '@/server/services/companyService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderService = getOrderService();
    const pdfService = getPDFService();
    const templateGenerator = getDocumentTemplateGenerator();
    const companyService = getCompanyService();

    const order = await orderService.getOrder(id);
    const company = await companyService.getCompany() || await companyService.ensureCompany();

    // Validate that at least one item exists
    if (!order.items || order.items.length === 0) {
      return NextResponse.json(
        { error: 'Order has no items' },
        { status: 400 }
      );
    }

    // Get the main item (first one) for nameplate
    const mainItem = order.items[0];

    // Prepare nameplate data
    const nameplateData: DocumentData = {
      type: 'NAMEPLATE',
      header: {
        companyName: company.name,
        companyAddress: company.address || undefined,
        companyPhone: company.phone || undefined,
        companyEmail: company.email || undefined,
        companyTaxId: company.taxId || undefined,
        logoPath: company.logo || undefined,
      },
      orderNumber: order.fullNumber,
      customerName: order.customerName,
      date: new Date(order.date),
      items: [
        {
          description: mainItem.description,
          quantity: 1,
          unitPrice: mainItem.unitPrice,
          discount: mainItem.discount,
          totalPrice: mainItem.totalPrice,
          serialNumbers: mainItem.serialNumbers ? JSON.parse(mainItem.serialNumbers) : undefined,
          specifications: mainItem.specifications ? JSON.parse(mainItem.specifications) : undefined,
        },
      ],
      subtotal: mainItem.totalPrice,
      taxRate: 0, // Nameplates typically don't have tax
      taxAmount: 0,
      total: mainItem.totalPrice,
      currency: order.currency,
      notes: order.notes || undefined,
      language: (order.documentLanguage || 'fr') as 'ar' | 'en' | 'fr',
    };

    // Generate and save nameplate PDF
    const pdfPath = await pdfService.generateAndSavePDF(
      order.customerId,
      order.customerName.split(' ')[0], // Use first word as short name
      nameplateData
    );

    return NextResponse.json({
      success: true,
      path: pdfPath,
      message: 'Nameplate generated successfully',
    });
  } catch (error) {
    console.error('Error generating nameplate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate nameplate' },
      { status: 500 }
    );
  }
}
