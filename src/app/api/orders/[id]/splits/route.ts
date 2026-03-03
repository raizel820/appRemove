import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch all document splits for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all DocumentSplit records for this order
    const allSplits = await db.documentSplit.findMany({
      where: {
        orderId: id,
      },
      orderBy: {
        splitIndex: 'asc',
      },
    });

    // Group splits by document type
    const invoiceSplits = allSplits.filter(split => split.documentType === 'invoice');
    const proformaSplits = allSplits.filter(split => split.documentType === 'proforma');
    const purchaseOrderSplits = allSplits.filter(split => split.documentType === 'purchase-order');
    const deliveryNoteSplits = allSplits.filter(split => split.documentType === 'delivery-note');

    return NextResponse.json({
      invoiceSplits,
      proformaSplits,
      purchaseOrderSplits,
      deliveryNoteSplits,
    });

  } catch (error) {
    console.error('Error fetching document splits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document splits' },
      { status: 500 }
    );
  }
}

// POST: Create new document splits for an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { documentType, splits } = body;

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

    // Delete existing splits for this document type
    await db.documentSplit.deleteMany({
      where: {
        orderId,
        documentType,
      },
    });

    // Create new split records
    const createdSplits = [];
    for (const split of splits) {
      const newSplit = await db.documentSplit.create({
        data: {
          orderId,
          documentType,
          splitIndex: split.index,
          itemIds: JSON.stringify(split.itemIds),
          number: split.number,
          status: 'DRAFT',
        },
      });
      createdSplits.push(newSplit);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${splits.length} ${documentType} splits`,
      splits: createdSplits,
    });

  } catch (error) {
    console.error('Error creating document splits:', error);
    return NextResponse.json(
      { error: 'Failed to create document splits' },
      { status: 500 }
    );
  }
}
