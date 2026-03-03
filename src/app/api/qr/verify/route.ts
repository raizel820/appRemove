import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/qr/verify
 * Verify QR code token
 * Checks both VerificationToken table and Order model for the token
 * Returns linked file information if found and valid
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, valid: false, error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Trim whitespace from token
    const trimmedToken = token.trim();

    console.log('Verifying token:', trimmedToken.substring(0, 30) + '...');

    // First, try to find the token in the Order model (document tokens) - check this FIRST
    // so order tokens are correctly identified even if they also exist in VerificationToken table
    let order = await db.order.findFirst({
      where: {
        OR: [
          { invoiceVerificationToken: trimmedToken },
          { proformaVerificationToken: trimmedToken },
          { purchaseOrderVerificationToken: trimmedToken },
          { deliveryNoteVerificationToken: trimmedToken },
        ],
      },
      select: {
        id: true,
        fullNumber: true,
        invoiceFullNumber: true,
        invoiceDate: true,
        invoiceVerificationToken: true,
        proformaFullNumber: true,
        proformaDate: true,
        proformaVerificationToken: true,
        purchaseOrderFullNumber: true,
        purchaseOrderDate: true,
        purchaseOrderVerificationToken: true,
        deliveryNoteFullNumber: true,
        deliveryNoteDate: true,
        deliveryNoteVerificationToken: true,
        customerName: true,
        total: true,
        currency: true,
        createdAt: true,
        type: true,
        status: true,
        customerId: true,
      },
    });

    if (!order) {
      // If no exact match, try to fetch all orders with tokens and compare manually
      // This handles cases where there might be encoding or whitespace differences
      const allOrders = await db.order.findMany({
        where: {
          OR: [
            { invoiceVerificationToken: { not: null } },
            { proformaVerificationToken: { not: null } },
            { purchaseOrderVerificationToken: { not: null } },
            { deliveryNoteVerificationToken: { not: null } },
          ],
        },
        select: {
          id: true,
          fullNumber: true,
          invoiceFullNumber: true,
          invoiceDate: true,
          invoiceVerificationToken: true,
          proformaFullNumber: true,
          proformaDate: true,
          proformaVerificationToken: true,
          purchaseOrderFullNumber: true,
          purchaseOrderDate: true,
          purchaseOrderVerificationToken: true,
          deliveryNoteFullNumber: true,
          deliveryNoteDate: true,
          deliveryNoteVerificationToken: true,
          customerName: true,
          total: true,
          currency: true,
          createdAt: true,
          type: true,
          status: true,
          customerId: true,
        },
        take: 100, // Limit to most recent orders
      });

      // Manually compare tokens
      order = allOrders.find(o =>
        o.invoiceVerificationToken?.trim() === trimmedToken ||
        o.proformaVerificationToken?.trim() === trimmedToken ||
        o.purchaseOrderVerificationToken?.trim() === trimmedToken ||
        o.deliveryNoteVerificationToken?.trim() === trimmedToken
      );

      if (order) {
        console.log('Found order via manual comparison');
      }
    } else {
      console.log('Found order via exact match');
    }

    if (order) {
      // Determine which document type this token belongs to
      let fileType = '';
      let fileNumber = '';
      let fileDate = null;

      if (order.invoiceVerificationToken?.trim() === trimmedToken) {
        fileType = 'Invoice';
        fileNumber = order.invoiceFullNumber || order.fullNumber || 'N/A';
        fileDate = order.invoiceDate || order.createdAt;
      } else if (order.proformaVerificationToken?.trim() === trimmedToken) {
        fileType = 'Proforma Invoice';
        fileNumber = order.proformaFullNumber || order.fullNumber || 'N/A';
        fileDate = order.proformaDate || order.createdAt;
      } else if (order.purchaseOrderVerificationToken?.trim() === trimmedToken) {
        fileType = 'Purchase Order';
        fileNumber = order.purchaseOrderFullNumber || order.fullNumber || 'N/A';
        fileDate = order.purchaseOrderDate || order.createdAt;
      } else if (order.deliveryNoteVerificationToken?.trim() === trimmedToken) {
        fileType = 'Delivery Note';
        fileNumber = order.deliveryNoteFullNumber || 'N/A';
        fileDate = order.deliveryNoteDate || order.createdAt;
      }

      console.log('Order token verified:', {
        fileType,
        fileNumber,
        fileDate,
        customerName: order.customerName,
        token: trimmedToken.substring(0, 20) + '...'
      });

      return NextResponse.json({
        success: true,
        valid: true,
        source: 'order',
        orderId: order.id,
        data: {
          customer: order.customerName || 'Unknown',
          fileType: fileType,
          fileNumber: fileNumber,
          fileDate: fileDate ? fileDate.toISOString().split('T')[0] : null,
          fileDateTime: fileDate ? fileDate.toISOString() : null,
          totalAmount: order.total,
          currency: order.currency,
          createdAt: order.createdAt,
          orderNumber: order.fullNumber,
          orderStatus: order.status,
          orderType: order.type,
        },
      });
    }

    console.log('Token not found in Orders table, checking DocumentSplit table...');

    // Check DocumentSplit table for split document tokens
    const documentSplit = await db.documentSplit.findFirst({
      where: {
        verificationToken: trimmedToken,
      },
      include: {
        order: {
          select: {
            id: true,
            fullNumber: true,
            customerName: true,
            total: true,
            currency: true,
            createdAt: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (documentSplit) {
      console.log('Found token in DocumentSplit table');

      // Determine document type from split.documentType
      let fileType = '';
      if (documentSplit.documentType === 'invoice') {
        fileType = 'Invoice';
      } else if (documentSplit.documentType === 'proforma') {
        fileType = 'Proforma Invoice';
      } else if (documentSplit.documentType === 'purchase-order') {
        fileType = 'Purchase Order';
      } else if (documentSplit.documentType === 'delivery-note') {
        fileType = 'Delivery Note';
      } else {
        fileType = documentSplit.documentType || 'Document';
      }

      const fileDate = documentSplit.date ? new Date(documentSplit.date) : documentSplit.createdAt;

      console.log('Split token verified:', {
        fileType,
        fileNumber: documentSplit.number,
        splitId: documentSplit.id,
        orderId: documentSplit.orderId,
        customerName: documentSplit.order?.customerName,
        token: trimmedToken.substring(0, 20) + '...'
      });

      return NextResponse.json({
        success: true,
        valid: true,
        source: 'split',
        orderId: documentSplit.orderId,
        splitId: documentSplit.id,
        data: {
          customer: documentSplit.order?.customerName || 'Unknown',
          fileType: fileType,
          fileNumber: documentSplit.number || 'N/A',
          fileDate: fileDate ? fileDate.toISOString().split('T')[0] : null,
          fileDateTime: fileDate ? fileDate.toISOString() : null,
          totalAmount: documentSplit.order?.total || null,
          currency: documentSplit.order?.currency || null,
          splitIndex: documentSplit.splitIndex,
          createdAt: documentSplit.createdAt,
        },
      });
    }

    console.log('Token not found in DocumentSplit table either, checking VerificationToken table...');

    // If not found in Order model, check VerificationToken table
    const dbToken = await db.verificationToken.findUnique({
      where: { token: trimmedToken }
    });

    if (dbToken) {
      console.log('Found token in VerificationToken table');

      // Determine source based on label
      // Tokens from orders have labels like "invoice-INV-001/2026", "proforma-PRO-001/2026", 
      // "purchase-order-PO-001/2026", "delivery-note-DN-001/2026", "order-001/2026"
      const isOrderToken = dbToken.label && (
        dbToken.label.startsWith('invoice-') ||
        dbToken.label.startsWith('proforma-') ||
        dbToken.label.startsWith('purchase-order-') ||
        dbToken.label.startsWith('delivery-note-') ||
        dbToken.label.startsWith('order-')
      );

      // Token exists in VerificationToken table, parse the linked JSON data
      let qrJsonData;
      try {
        qrJsonData = JSON.parse(dbToken.qrJsonData);
      } catch (error) {
        console.error('Error parsing QR JSON data:', error);
        qrJsonData = dbToken.qrJsonData;
      }

      // Use embedded verification data if available (always contains essential info)
      // Otherwise fall back to extracted data from the JSON
      const embeddedVerification = qrJsonData._verification;
      const fileInfo = qrJsonData.file || {};
      const companyInfo = qrJsonData.company || {};
      const customerInfo = qrJsonData.customer || {};

      console.log('Token verified:', {
        source: isOrderToken ? 'order' : 'test',
        hasEmbeddedVerification: !!embeddedVerification,
        fileInfo,
        customerInfo,
        embeddedVerification,
        token: trimmedToken.substring(0, 20) + '...'
      });

      return NextResponse.json({
        success: true,
        valid: true,
        source: isOrderToken ? 'order' : 'test',
        data: {
          customer: embeddedVerification?.customerName || customerInfo.name || 'Unknown',
          fileType: embeddedVerification?.fileType || fileInfo.type || 'Unknown',
          fileNumber: embeddedVerification?.fileNumber || fileInfo.number || 'Unknown',
          fileDate: embeddedVerification?.date || fileInfo.date || null,
          totalAmount: embeddedVerification?.totalAmount || fileInfo.totalAmount || fileInfo.total || null,
          currency: fileInfo.currency || null,
          createdAt: dbToken.createdAt,
        },
        rawData: qrJsonData,
      });
    }

    console.log('Token not found in VerificationToken table either');

    // Token not found in either table
    return NextResponse.json({
      success: true,
      valid: false,
      error: 'Token not found',
      message: 'This verification token does not exist in the system',
    });

  } catch (error) {
    console.error('Error verifying QR code token:', error);
    return NextResponse.json(
      { success: false, valid: false, error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
