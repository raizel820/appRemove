
/**
 * POST /api/orders/[id]/generate-pdf
 * Generate PDF for an order (invoice, proforma, delivery note, PO)
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

    // Prepare PDF data with unified header
    const pdfData: DocumentData = {
      type: order.type as any,
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
      customerAddress: order.customerId, // Will be fetched from customer if needed
      customerEmail: undefined, // Could be fetched from customer
      customerPhone: undefined, // Could be fetched from customer
      customerTaxId: undefined, // Could be fetched from customer
      date: new Date(order.date),
      dueDate: order.dueDate ? new Date(order.dueDate) : undefined,
      items: order.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        totalPrice: item.totalPrice,
        serialNumbers: item.serialNumbers ? JSON.parse(item.serialNumbers) : undefined,
        specifications: item.specifications ? JSON.parse(item.specifications) : undefined,
      })),
      subtotal: order.subtotal,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      total: order.total,
      currency: order.currency,
      notes: order.notes || undefined,
      language: (order.documentLanguage || 'fr') as 'ar' | 'en' | 'fr', // Document language (separate from UI)
    };

    // Generate and save PDF
    const pdfPath = await pdfService.generateAndSavePDF(
      order.customerId,
      order.customerName.split(' ')[0], // Use first word as short name
      pdfData
    );

    // Update order with PDF path
    await orderService.updateOrder(id, { pdfPath });

    return NextResponse.json({
      success: true,
      path: pdfPath,
      message: 'PDF generated successfully',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/[id]/generate-pdf
 * Check if PDF exists and get path
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderService = getOrderService();
    const order = await orderService.getOrder(id);

    if (!order.pdfPath) {
      return NextResponse.json(
        { error: 'PDF not generated yet' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      path: order.pdfPath,
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch PDF' },
      { status: 500 }
    );
  }
}
