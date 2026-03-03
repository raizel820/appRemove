import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * Validation schemas
 */

const CreateFileInput = z.object({
  orderId: z.string().min(1, 'Order ID required'),
  fileType: z.enum(['INVOICE', 'PROFORMA', 'PURCHASE_ORDER', 'DELIVERY_NOTE', 'TECHNICAL_FILE', 'NAMEPLATE']),
  fileDate: z.string().min(1, 'File date required'),
  notes: z.string().max(5000).optional(),
});

const CreateFileResponse = z.object({
  id: z.string().uuid(),
  orderId: z.string(),
  fileType: z.nativeEnum(CreateFileInput.shape.fileType),
  numberYear: z.number(),
  numberSequence: z.number(),
  fullNumber: z.string(),
  fileDate: z.string().datetime(),
  status: z.enum(['DRAFT', 'READY', 'ERROR']),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Helper function to get next file sequence number
 */
async function getNextFileSequence(fileType: string, year: number): Promise<number> {
  // Find or create the file sequence record
  let sequence = await db.fileSequence.findUnique({
    where: {
      fileType_year: {
        fileType: fileType as any,
        year,
      },
    },
  });

  if (!sequence) {
    sequence = await db.fileSequence.create({
      data: {
        fileType: fileType as any,
        year,
        sequence: 0,
      },
    });
  }

  // Increment and return
  const newSequence = sequence.sequence + 1;
  await db.fileSequence.update({
    where: { id: sequence.id },
    data: { sequence: newSequence },
  });

  return newSequence;
}

/**
 * Format file number based on file type
 */
function formatFileNumber(fileType: string, year: number, sequence: number): string {
  const prefixMap: Record<string, string> = {
    INVOICE: 'FAC',
    PROFORMA: 'PRO',
    PURCHASE_ORDER: 'BC',
    DELIVERY_NOTE: 'BL',
    TECHNICAL_FILE: 'FT',
    NAMEPLATE: 'PL',
  };

  const prefix = prefixMap[fileType] || 'DOC';
  const sequenceStr = String(sequence).padStart(6, '0');
  return `${prefix}-${year}-${sequenceStr}`;
}

/**
 * POST /api/files - Create a new file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = CreateFileInput.parse(body);

    // Normalize file date
    const fileDate = new Date(input.fileDate);
    const fileDateISO = fileDate.toISOString();
    const year = fileDate.getFullYear();

    // Validate order exists
    const order = await db.order.findUnique({
      where: {
        id: input.orderId,
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Begin transaction to create file
    const file = await db.$transaction(async (tx) => {
      // Get next sequence number for this file type and year
      const sequenceNumber = await getNextFileSequence(input.fileType, year);
      const fullNumber = formatFileNumber(input.fileType, year, sequenceNumber);

      // Get current PDF configuration as template snapshot
      const pdfConfig = await tx.pDFConfiguration.findFirst();
      const templateVersion = pdfConfig ? { id: pdfConfig.id, updatedAt: pdfConfig.updatedAt } : {};

      // Create file record
      const newFile = await tx.file.create({
        data: {
          orderId: input.orderId,
          fileType: input.fileType as any,
          numberYear: year,
          numberSequence: sequenceNumber,
          fullNumber,
          fileDate: fileDateISO,
          status: 'DRAFT',
          pdfPath: null,
          templateVersion,
          notes: input.notes || null,
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'FILE',
          entityId: newFile.id,
          orderId: input.orderId,
          userId: 'system',
          metadata: JSON.stringify({
            fileType: input.fileType,
            fileNumber: fullNumber,
            orderId: input.orderId,
            orderNumber: order.fullNumber,
          }),
        },
      });

      return newFile;
    });

    // Return success response
    return NextResponse.json(
      {
        id: file.id,
        orderId: file.orderId,
        fileType: file.fileType,
        numberYear: file.numberYear,
        numberSequence: file.numberSequence,
        fullNumber: file.fullNumber,
        fileDate: file.fileDate,
        status: file.status,
        notes: file.notes,
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating file:', error);

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
 * GET /api/files - List files for an order
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const files = await db.file.findMany({
      where: {
        orderId,
        deletedAt: null,
      },
      orderBy: {
        fileDate: 'desc',
      },
      include: {
        revisions: {
          orderBy: {
            revisionNumber: 'desc',
          },
          take: 1,
        },
      },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
