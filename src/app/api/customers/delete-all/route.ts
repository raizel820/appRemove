import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // First, permanently delete all soft-deleted customers
    const softDeleted = await db.customer.findMany({
      where: {
        deletedAt: { not: null },
      },
      select: {
        id: true,
      },
    });

    if (softDeleted.length > 0) {
      // Permanently delete each soft-deleted customer
      await db.customer.deleteMany({
        where: {
          id: {
            in: softDeleted.map(c => c.id),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Permanently deleted ${softDeleted.length} soft-deleted customers`,
    });
  } catch (error) {
    console.error('Error deleting all customers:', error);
    return NextResponse.json(
      { error: 'Failed to delete customers' },
      { status: 500 }
    );
  }
}
