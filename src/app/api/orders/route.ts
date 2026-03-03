/**
 * POST /api/orders - Create a new order
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { generateVerificationToken } from '@/lib/hashedTokenUtil';
import type { FileVerificationData } from '@/lib/hashedTokenUtil';

// Validation schemas
const CreateOrderInput = z.object({
  customerId: z.string().optional(),
  customerSnapshot: z.object({
    fullName: z.string().optional(),
    shortName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  date: z.string().min(1, 'Date required'),
  currency: z.string().optional(),
  items: z.array(
    z.object({
      familyId: z.string().optional(),
      modelId: z.string().optional(),
      quantity: z.number().int().positive('Quantity must be positive'),
      unitPrice: z.number().nonnegative('Unit price cannot be negative'),
      discount: z.number().nonnegative().optional(),
    })
  ).min(1, 'At least one item required'),
  taxRate: z.number().nonnegative().optional(),
  notes: z.string().max(5000, 'Notes cannot exceed 5000 characters').optional(),
  documentLanguage: z.enum(['en', 'fr', 'ar']).optional(),
  activityProfileId: z.string().optional(),
  reservedYear: z.number().optional(),
  reservedSeq: z.number().optional(),
  reservedId: z.string().optional(),
});

// List orders query params schema
const ListOrdersQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
});

/**
 * POST /api/orders - Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CreateOrderInput.parse(body);

    // Validate that customerId is provided (customer is now required)
    if (!input.customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Normalize dates to UTC/ISO-8601
    const orderDate = new Date(input.date);
    const orderDateISO = orderDate.toISOString();
    const year = orderDate.getFullYear();

    // Step 2: Validate customer exists
    const customer = await db.customer.findUnique({
      where: {
        id: input.customerId,
        deletedAt: null,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customerName = customer.fullName || customer.shortName || '';

    // Step 3: Business validation on items & prefetch models
    const modelIds = input.items
      .map(item => item.modelId)
      .filter((id): id is string => id !== undefined);

    const modelsMap = new Map();
    if (modelIds.length > 0) {
      const models = await db.machineModel.findMany({
        where: {
          id: { in: modelIds },
        },
        include: {
          family: true,
        },
      });
      models.forEach(model => modelsMap.set(model.id, model));
    }

    for (const item of input.items) {
      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Item quantity must be positive' },
          { status: 400 }
        );
      }

      if (item.unitPrice < 0 && !item.discount) {
        return NextResponse.json(
          { error: 'Item unit price cannot be negative without discount' },
          { status: 400 }
        );
      }

      if (item.modelId) {
        const model = modelsMap.get(item.modelId);
        if (!model) {
          return NextResponse.json(
            { error: `Model not found: ${item.modelId}` },
            { status: 404 }
          );
        }
      }
    }

    // Step 4: Determine sequence number
    let seq: number;
    let fullNumber: string;

    if (input.reservedYear !== undefined && input.reservedSeq !== undefined && input.reservedId !== undefined) {
      // User provided a reserved number - finalize it directly
      // finalizeReservation will validate ownership and expiration
      const { getYearAwareOrderNumberingService } = await import('@/server/services/yearAwareOrderNumberingService');
      const service = getYearAwareOrderNumberingService();

      seq = input.reservedSeq;

      // Finalize the reservation (includes validation)
      await service.finalizeReservation(
        input.reservedYear,
        input.reservedSeq,
        input.reservedId
      );
    } else {
      // Generate next number using year-aware service
      const { getYearAwareOrderNumberingService } = await import('@/server/services/yearAwareOrderNumberingService');
      const service = getYearAwareOrderNumberingService();

      // Reserve the next number for this year
      const reservation = await service.reserveNextForYear(year, `auto-order-${Date.now()}`);

      // Finalize the reservation
      await service.finalizeReservation(
        reservation.year,
        reservation.seq,
        reservation.reservationId
      );

      seq = reservation.seq;
    }

    // Format: orderCount/year, e.g., 001/2026
    const seqStr = String(seq).padStart(3, '0');
    fullNumber = `${seqStr}/${year}`;

    // Step 5: Begin database transaction
    const order = await db.$transaction(
      async (tx) => {
        // Step 6: Compute item totals with rounding
        const currency = input.currency || 'EUR';
        let subtotal = 0;
        let totalTax = 0;

        for (const item of input.items) {
          const lineNet = item.quantity * item.unitPrice;
          const lineDiscount = item.discount || 0;
          const lineAfterDiscount = lineNet - lineDiscount;

          let lineTax = 0;
          if (input.taxRate) {
            lineTax = lineAfterDiscount * (input.taxRate / 100);
          }

          subtotal += lineAfterDiscount;
          totalTax += lineTax;
        }

        const taxRate = input.taxRate || 0;
        const taxAmount = Math.round(totalTax * 100) / 100;
        const total = Math.round((subtotal + taxAmount) * 100) / 100;

        // Step 7: Create order record with year and seq from OrderNumbers
        const newOrder = await tx.order.create({
          data: {
            type: 'INVOICE',
            numberYear: year,
            numberSequence: seq,
            fullNumber,
            customerId: customer.id,
            customerName,
            date: orderDateISO,
            status: 'DRAFT',
            currency,
            subtotal: Math.round(subtotal * 100) / 100,
            taxRate,
            taxAmount,
            total,
            notes: input.notes || null,
            documentLanguage: input.documentLanguage || 'fr',
            activityProfileId: input.activityProfileId || null,
          },
        });

        // Step 8: Create order items
        for (const item of input.items) {
          let description = '';

          if (item.modelId) {
            const model = modelsMap.get(item.modelId);
            if (model) {
              description = `${model.family?.code || ''} ${model.name}`;
            }
          }

          const lineNet = item.quantity * item.unitPrice;
          const lineDiscount = item.discount || 0;
          const lineAfterDiscount = lineNet - lineDiscount;

          let lineTax = 0;
          if (input.taxRate) {
            lineTax = lineAfterDiscount * (input.taxRate / 100);
          }

          const lineTotal = lineAfterDiscount + lineTax;

          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              modelId: item.modelId || null,
              description: description || 'Custom Item',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: lineDiscount,
              totalPrice: Math.round(lineTotal * 100) / 100,
              specifications: null,
              isCustomized: false,
              customizationVersion: null,
            },
          });
        }

        return newOrder;
      },
      {
        maxWait: 10000, // 10 seconds timeout
      }
    );

    // Step 9: Create audit log entry outside transaction
    const currency = input.currency || 'EUR';
    let subtotal = 0;
    let totalTax = 0;

    for (const item of input.items) {
      const lineNet = item.quantity * item.unitPrice;
      const lineDiscount = item.discount || 0;
      const lineAfterDiscount = lineNet - lineDiscount;

      let lineTax = 0;
      if (input.taxRate) {
        lineTax = lineAfterDiscount * (input.taxRate / 100);
      }

      subtotal += lineAfterDiscount;
      totalTax += lineTax;
    }

    const taxRate = input.taxRate || 0;
    const taxAmount = Math.round(totalTax * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    await db.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'ORDER',
        entityId: order.id,
        orderId: order.id,
        customerId: customer?.id || null,
        userId: 'system',
        metadata: JSON.stringify({
          orderType: 'INVOICE',
          customerName,
          itemCount: input.items.length,
          currency,
          subtotal,
          taxRate,
          taxAmount,
          total,
          reservedYear: year,
          reservedSeq: seq,
        }),
      },
    });

    // Step 10: Generate and store verification token for the order
    try {
      // Prepare verification data for the order
      const verificationData: FileVerificationData = {
        fileNumber: order.fullNumber,
        fileType: 'Order',
        date: orderDateISO,
        totalAmount: total,
        companyName: customer?.fullName || 'EURL LA SOURCE',
        customerName: customerName,
      };

      // Generate the verification token
      const token = generateVerificationToken(verificationData);

      // Prepare QR JSON data (similar to what would be in the QR code)
      const qrJsonData = {
        company: {
          name: customer?.fullName || 'EURL LA SOURCE',
        },
        customer: {
          name: customerName,
        },
        file: {
          number: order.fullNumber,
          type: 'Order',
          date: orderDateISO,
          totalAmount: total,
        },
        verificationToken: token,
      };

      // Save to database with order number as label for easy identification
      await db.verificationToken.create({
        data: {
          token,
          qrJsonData: JSON.stringify(qrJsonData),
          label: `order-${order.fullNumber}`, // Use order number as label
        }
      });

      console.log(`Verification token generated and stored for order ${order.fullNumber}`);
    } catch (tokenError) {
      // Log error but don't fail the order creation
      console.error('Error generating verification token for order:', tokenError);
    }

    // Step 11: Return success response
    return NextResponse.json(
      {
        id: order.id,
        type: order.type,
        numberYear: order.numberYear,
        numberSequence: order.numberSequence,
        fullNumber: order.fullNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        date: order.date,
        status: order.status,
        currency: order.currency,
        subtotal: order.subtotal,
        taxRate: order.taxRate,
        taxAmount: order.taxAmount,
        total: order.total,
        notes: order.notes,
        pdfPath: order.pdfPath,
        documentLanguage: order.documentLanguage,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating order:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error: ' + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders - List orders with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = ListOrdersQuery.parse(Object.fromEntries(searchParams));

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.search) {
      where.OR = [
        { fullNumber: { contains: query.search } },
        { customerName: { contains: query.search } },
        { notes: { contains: query.search } },
      ];
    }

    // Get total count and orders
    const [total, orders] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        include: {
          items: {
            include: {
              model: {
                include: {
                  family: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing orders:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error: " + error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
