import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentType: string }> }
) {
  try {
    const { documentType } = await params;
    const body = await request.json();
    const { splits, originalDocumentNumber, originalDocumentYear } = body;

    // Validate document type
    const validDocumentTypes = ['invoice', 'proforma', 'purchase-order', 'delivery-note'];
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Validate splits
    if (!splits || !Array.isArray(splits) || splits.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 splits are required' },
        { status: 400 }
      );
    }

    // Map document type to field prefixes
    const fieldMap: Record<string, { prefix: string; collection: string }> = {
      'invoice': { prefix: 'invoice', collection: 'Invoice' },
      'proforma': { prefix: 'proforma', collection: 'Proforma' },
      'purchase-order': { prefix: 'purchaseOrder', collection: 'PurchaseOrder' },
      'delivery-note': { prefix: 'deliveryNote', collection: 'DeliveryNote' },
    };

    const { prefix, collection } = fieldMap[documentType];

    // Get the original order to extract snapshots
    const originalOrder = await db.order.findFirst({
      where: {
        OR: [
          { invoiceFullNumber: originalDocumentNumber },
          { proformaFullNumber: originalDocumentNumber },
          { purchaseOrderFullNumber: originalDocumentNumber },
          { deliveryNoteFullNumber: originalDocumentNumber },
        ],
      },
      include: {
        items: true,
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { error: 'Original order not found' },
        { status: 404 }
      );
    }

    // Create split orders/documents
    const createdDocuments = [];

    for (const split of splits) {
      const timestamp = Date.now();
      const uniqueId = `${split.index}-${timestamp}`;

      // Create a new order for each split
      const newOrder = await db.order.create({
        data: {
          type: documentType === 'purchase-order' ? 'PURCHASE_ORDER' : 
                  documentType === 'delivery-note' ? 'DELIVERY_NOTE' :
                  documentType === 'proforma' ? 'PROFORMA' : 'INVOICE',
          fullNumber: `SPLIT-${uniqueId}`,
          numberYear: new Date(split.date).getFullYear(),
          numberSequence: split.index + 1,
          customerId: originalOrder.customerId,
          customerName: originalOrder.customerName,
          date: new Date(split.date),
          status: 'DRAFT',
          currency: originalOrder.currency,
          subtotal: split.subtotal,
          taxRate: split.taxRate,
          taxAmount: split.taxAmount,
          total: split.total,
          notes: `Split from ${originalDocumentNumber}`,
          documentLanguage: originalOrder.documentLanguage,
          activityProfileId: originalOrder.activityProfileId,
          snapshotCompany: originalOrder.snapshotCompany,
          snapshotCustomer: originalOrder.snapshotCustomer,
          snapshotPdfConfig: originalOrder.snapshotPdfConfig,
          // Split document tracking
          parentId: originalOrder.id,
          splitOfDocumentType: documentType,
          splitIndex: split.index,
          // Set document-specific fields
          [`${prefix}FullNumber`]: split.number,
          [`${prefix}Year`]: originalDocumentYear,
          [`${prefix}Sequence`]: parseInt(split.number.split('/')[0]),
          [`${prefix}Date`]: new Date(split.date),
          [`${prefix}Status`]: 'ISSUED',
          [`${prefix}VerificationToken`]: split.verificationToken,
        },
      });

      // Create items for the split order
      for (const item of split.items) {
        await db.orderItem.create({
          data: {
            orderId: newOrder.id,
            modelId: item.modelId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            totalPrice: item.totalPrice,
            specifications: item.model ? JSON.stringify({
              name: item.model.name,
              code: item.model.code,
              family: item.model.family,
            }) : null,
            snapshotModel: originalOrder.snapshotPdfConfig,
          },
        });
      }

      createdDocuments.push({
        id: newOrder.id,
        fullNumber: newOrder.fullNumber,
        documentNumber: split.number,
        itemsCount: split.items.length,
        total: split.total,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${splits.length} ${documentType} splits`,
      documents: createdDocuments,
    });

  } catch (error) {
    console.error('Error splitting document:', error);
    return NextResponse.json(
      { error: 'Failed to split document' },
      { status: 500 }
    );
  }
}
