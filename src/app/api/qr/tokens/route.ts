import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/qr/tokens
 * List verification tokens with optional search filter
 * Query params:
 * - search: Filter by file number, type, or date
 * - limit: Maximum number of tokens to return (default: 50)
 * - skip: Number of tokens to skip for pagination (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Fetch tokens from VerificationToken table (test tokens)
    const where: any = {};

    if (search) {
      where.OR = [
        { qrJsonData: { contains: search } }, // Search in JSON data
        { label: { contains: search } },      // Search in label
      ];
    }

    const testTokens = await db.verificationToken.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    // Parse JSON data and extract relevant info from test tokens
    const testTokensWithInfo = testTokens.map(token => {
      let fileInfo = { type: null, number: null, date: null };
      let customerName = null;

      try {
        const jsonData = JSON.parse(token.qrJsonData);

        // Extract file info from JSON data
        if (jsonData.file) {
          fileInfo = {
            type: jsonData.file.type || null,
            number: jsonData.file.number || null,
            date: jsonData.file.date || null,
          };
        }

        // Extract customer name from embedded verification data
        if (jsonData._verification && jsonData._verification.customerName) {
          customerName = jsonData._verification.customerName;
        } else if (jsonData.customer && jsonData.customer.name) {
          customerName = jsonData.customer.name;
        }
      } catch (error) {
        console.error('Error parsing token JSON:', error);
      }

      // Determine source based on label
      // Tokens from orders have labels like "invoice-INV-001/2026", "proforma-PRO-001/2026", 
      // "purchase-order-PO-001/2026", "delivery-note-DN-001/2026", "order-001/2026"
      const isOrderToken = token.label && (
        token.label.startsWith('invoice-') ||
        token.label.startsWith('proforma-') ||
        token.label.startsWith('purchase-order-') ||
        token.label.startsWith('delivery-note-') ||
        token.label.startsWith('order-')
      );

      return {
        id: token.id,
        token: token.token,
        label: token.label || 'test',
        createdAt: token.createdAt,
        fileInfo,
        customerName,
        source: isOrderToken ? 'order' : 'test',
      };
    });

    // Fetch orders with verification tokens
    const orderWhere: any = {
      OR: [
        { invoiceVerificationToken: { not: null } },
        { proformaVerificationToken: { not: null } },
        { purchaseOrderVerificationToken: { not: null } },
        { deliveryNoteVerificationToken: { not: null } },
      ],
    };

    // Add search filter if provided
    if (search) {
      orderWhere.OR = [
        { invoiceVerificationToken: { contains: search } },
        { proformaVerificationToken: { contains: search } },
        { purchaseOrderVerificationToken: { contains: search } },
        { deliveryNoteVerificationToken: { contains: search } },
        { customerName: { contains: search } },
        { fullNumber: { contains: search } },
        { invoiceFullNumber: { contains: search } },
        { proformaFullNumber: { contains: search } },
        { purchaseOrderFullNumber: { contains: search } },
        { deliveryNoteFullNumber: { contains: search } },
      ];
    }

    const orders = await db.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      select: {
        id: true,
        invoiceVerificationToken: true,
        proformaVerificationToken: true,
        purchaseOrderVerificationToken: true,
        deliveryNoteVerificationToken: true,
        invoiceFullNumber: true,
        invoiceDate: true,
        proformaFullNumber: true,
        proformaDate: true,
        purchaseOrderFullNumber: true,
        purchaseOrderDate: true,
        deliveryNoteFullNumber: true,
        deliveryNoteDate: true,
        customerName: true,
        total: true,
        currency: true,
        createdAt: true,
        type: true,
      },
    });

    // Convert order verification tokens to token objects
    const orderTokens: any[] = [];

    orders.forEach(order => {
      const baseOrderInfo = {
        orderId: order.id,
        customerName: order.customerName,
        total: order.total,
        currency: order.currency,
        orderCreatedAt: order.createdAt,
      };

      // Invoice token
      if (order.invoiceVerificationToken) {
        orderTokens.push({
          id: `invoice-${order.id}`,
          token: order.invoiceVerificationToken,
          label: 'invoice',
          createdAt: order.invoiceDate || order.createdAt,
          fileInfo: {
            type: 'Invoice',
            number: order.invoiceFullNumber,
            date: order.invoiceDate ? order.invoiceDate.toISOString().split('T')[0] : null,
          },
          source: 'order',
          ...baseOrderInfo,
        });
      }

      // Proforma token
      if (order.proformaVerificationToken) {
        orderTokens.push({
          id: `proforma-${order.id}`,
          token: order.proformaVerificationToken,
          label: 'proforma',
          createdAt: order.proformaDate || order.createdAt,
          fileInfo: {
            type: 'Proforma',
            number: order.proformaFullNumber,
            date: order.proformaDate ? order.proformaDate.toISOString().split('T')[0] : null,
          },
          source: 'order',
          ...baseOrderInfo,
        });
      }

      // Purchase order token
      if (order.purchaseOrderVerificationToken) {
        orderTokens.push({
          id: `purchase-order-${order.id}`,
          token: order.purchaseOrderVerificationToken,
          label: 'purchase-order',
          createdAt: order.purchaseOrderDate || order.createdAt,
          fileInfo: {
            type: 'Purchase Order',
            number: order.purchaseOrderFullNumber,
            date: order.purchaseOrderDate ? order.purchaseOrderDate.toISOString().split('T')[0] : null,
          },
          source: 'order',
          ...baseOrderInfo,
        });
      }

      // Delivery note token
      if (order.deliveryNoteVerificationToken) {
        orderTokens.push({
          id: `delivery-note-${order.id}`,
          token: order.deliveryNoteVerificationToken,
          label: 'delivery-note',
          createdAt: order.deliveryNoteDate || order.createdAt,
          fileInfo: {
            type: 'Delivery Note',
            number: order.deliveryNoteFullNumber,
            date: order.deliveryNoteDate ? order.deliveryNoteDate.toISOString().split('T')[0] : null,
          },
          source: 'order',
          ...baseOrderInfo,
        });
      }
    });
    // Fetch split documents with verification tokens
    const splits = await db.documentSplit.findMany({
      where: {
        verificationToken: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
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
          },
        },
      },
    });

    // Convert split verification tokens to token objects
    const splitTokens: any[] = [];

    splits.forEach(split => {
      if (split.verificationToken) {
        const fileInfo = {
          type: '',
          number: split.number,
          date: split.date ? new Date(split.date).toISOString().split('T')[0] : null,
        };

        // Determine document type from split.documentType
        if (split.documentType === 'invoice') {
          fileInfo.type = 'Invoice';
        } else if (split.documentType === 'proforma') {
          fileInfo.type = 'Proforma';
        } else if (split.documentType === 'purchase-order') {
          fileInfo.type = 'Purchase Order';
      } else if (split.documentType === 'delivery-note') {
        fileInfo.type = 'Delivery Note';
      }

        splitTokens.push({
          id: `split-${split.id}`,
          token: split.verificationToken,
          label: split.documentType || 'document',
          createdAt: split.date ? new Date(split.date) : new Date(),
          fileInfo,
          source: 'split',
          orderId: split.orderId,
          splitId: split.id,
          customerName: split.order?.customerName || 'Unknown',
          total: split.order?.total || 0,
          currency: split.order?.currency || 'EUR',
        });
      }
    });

    // Merge and sort all tokens by creation date, then deduplicate by token value
    const allTokens = [...testTokensWithInfo, ...orderTokens, ...splitTokens]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Deduplicate by token value, keeping the most recent one
    const tokenMap = new Map<string, any>();
    allTokens.forEach(token => {
      // If token already exists, prefer the one with source 'split' > 'order' > 'test'
      const existing = tokenMap.get(token.token);
      if (!existing || 
          (token.source === 'split') ||
          (token.source === 'order' && existing.source === 'test') ||
          (token.source === 'order' && existing.source !== 'split')
        ) {
        tokenMap.set(token.token, token);
      }
    });

    const uniqueTokens = Array.from(tokenMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    // Get total count (unique tokens after deduplication)
    const testTokenCount = await db.verificationToken.count({ where });
    const orderTokenCount = orders.reduce((count, order) => {
      let c = 0;
      if (order.invoiceVerificationToken) c++;
      if (order.proformaVerificationToken) c++;
      if (order.purchaseOrderVerificationToken) c++;
      if (order.deliveryNoteVerificationToken) c++;
      return count + c;
    }, 0);

    const splitTokenCount = splits.length;

    // Count unique tokens by collecting all token values
    const allTokensValues = new Set<string>();
    testTokensWithInfo.forEach(t => allTokensValues.add(t.token));
    orderTokens.forEach(t => allTokensValues.add(t.token));
    splitTokens.forEach(t => allTokensValues.add(t.token));

    return NextResponse.json({
      success: true,
      data: uniqueTokens,
      totalCount: allTokensValues.size,
      testTokenCount,
      orderTokenCount,
      splitTokenCount,
    });
  } catch (error) {
    console.error('Error listing verification tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list verification tokens' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/qr/tokens
 * Delete selected tokens by IDs
 * Body: { tokenIds: string[] }
 * Token IDs can be:
 *   - Test tokens: Direct IDs from VerificationToken table (e.g., "clxxx...")
 *   - Order tokens: Composite IDs (e.g., "invoice-{orderId}", "proforma-{orderId}", etc.)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { tokenIds } = await request.json();

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No token IDs provided' },
        { status: 400 }
      );
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // Separate test tokens from order tokens
    const testTokenIds: string[] = [];
    const orderTokensMap = new Map<string, string[]>(); // orderId -> token types
    const splitIdsToDelete: string[] = []; // List of split IDs to delete

    tokenIds.forEach(tokenId => {
      if (tokenId.startsWith('invoice-')) {
        const orderId = tokenId.replace('invoice-', '');
        if (!orderTokensMap.has(orderId)) {
          orderTokensMap.set(orderId, []);
        }
        orderTokensMap.get(orderId)!.push('invoice');
      } else if (tokenId.startsWith('proforma-')) {
        const orderId = tokenId.replace('proforma-', '');
        if (!orderTokensMap.has(orderId)) {
          orderTokensMap.set(orderId, []);
        }
        orderTokensMap.get(orderId)!.push('proforma');
      } else if (tokenId.startsWith('purchase-order-')) {
        const orderId = tokenId.replace('purchase-order-', '');
        if (!orderTokensMap.has(orderId)) {
          orderTokensMap.set(orderId, []);
        }
        orderTokensMap.get(orderId)!.push('purchase-order');
      } else if (tokenId.startsWith('delivery-note-')) {
        const orderId = tokenId.replace('delivery-note-', '');
        if (!orderTokensMap.has(orderId)) {
          orderTokensMap.set(orderId, []);
        }
        orderTokensMap.get(orderId)!.push('delivery-note');
      } else if (tokenId.startsWith('split-')) {
        const splitId = tokenId.replace('split-', '');
        splitIdsToDelete.push(splitId);
      } else {
        // Assume it's a test token ID
        testTokenIds.push(tokenId);
      }
    });

    // Delete test tokens from VerificationToken table
    if (testTokenIds.length > 0) {
      try {
        const result = await db.verificationToken.deleteMany({
          where: {
            id: { in: testTokenIds },
          },
        });
        deletedCount += result.count;
      } catch (error) {
        console.error('Error deleting test tokens:', error);
        errors.push('Failed to delete some test tokens');
      }
    }

    // Clear verification tokens from split documents
    for (const splitId of splitIdsToDelete) {
      try {
        const updateData = { verificationToken: null };
        await db.documentSplit.update({
          where: { id: splitId },
          data: updateData,
        });
        deletedCount++;
      } catch (error) {
        console.error(`Error clearing token for split ${splitId}:`, error);
        errors.push(`Failed to clear token for split ${splitId}`);
      }
    }

    // Clear verification tokens from orders
    for (const [orderId, tokenTypes] of orderTokensMap) {
      try {
        const updateData: any = {};
        let hasUpdates = false;

        // Get the order to fetch token values
        const order = await db.order.findUnique({
          where: { id: orderId },
          select: {
            invoiceVerificationToken: true,
            proformaVerificationToken: true,
            purchaseOrderVerificationToken: true,
            deliveryNoteVerificationToken: true,
          },
        });

        if (tokenTypes.includes('invoice') && order?.invoiceVerificationToken) {
          updateData.invoiceVerificationToken = null;
          hasUpdates = true;

          // Also delete from VerificationToken table
          await db.verificationToken.deleteMany({
            where: { token: order.invoiceVerificationToken },
          }).catch(() => {
            // Token might not exist in VerificationToken table, ignore error
          });
        }
        if (tokenTypes.includes('proforma') && order?.proformaVerificationToken) {
          updateData.proformaVerificationToken = null;
          hasUpdates = true;

          // Also delete from VerificationToken table
          await db.verificationToken.deleteMany({
            where: { token: order.proformaVerificationToken },
          }).catch(() => {
            // Token might not exist in VerificationToken table, ignore error
          });
        }
        if (tokenTypes.includes('purchase-order') && order?.purchaseOrderVerificationToken) {
          updateData.purchaseOrderVerificationToken = null;
          hasUpdates = true;

          // Also delete from VerificationToken table
          await db.verificationToken.deleteMany({
            where: { token: order.purchaseOrderVerificationToken },
          }).catch(() => {
            // Token might not exist in VerificationToken table, ignore error
          });
        }
        if (tokenTypes.includes('delivery-note') && order?.deliveryNoteVerificationToken) {
          updateData.deliveryNoteVerificationToken = null;
          hasUpdates = true;

          // Also delete from VerificationToken table
          await db.verificationToken.deleteMany({
            where: { token: order.deliveryNoteVerificationToken },
          }).catch(() => {
            // Token might not exist in VerificationToken table, ignore error
          });
        }

        if (hasUpdates) {
          await db.order.update({
            where: { id: orderId },
            data: updateData,
          });
          deletedCount += tokenTypes.length;
        }
      } catch (error) {
        console.error(`Error clearing tokens for order ${orderId}:`, error);
        errors.push(`Failed to clear tokens for order ${orderId}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error deleting verification tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete verification tokens' },
      { status: 500 }
    );
  }
}
