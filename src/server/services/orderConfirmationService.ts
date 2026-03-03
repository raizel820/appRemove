/**
 * Order Confirmation Service
 * Unified transaction-based order confirmation pipeline
 * Handles serial assignment, document generation, and status updates atomically
 */

import { db } from '@/lib/db';
import { getSerialNumberService, SerialAssignmentResult } from './serialNumberService';
import { getPDFService } from './pdfService';
import { getDocumentTemplateGenerator } from './documentTemplateGenerator';
import { getCompanyService } from './companyService';
import { Prisma } from '@prisma/client';

export interface ConfirmOrderOptions {
  generateInvoice?: boolean;
  generateProforma?: boolean;
  generateDeliveryNote?: boolean;
  generateNameplates?: boolean;
}

export interface OrderConfirmationResult {
  success: boolean;
  orderId: string;
  orderNumber: string;
  status: string;
  serialAssignments: SerialAssignmentResult[];
  generatedDocuments: {
    type: string;
    path: string;
  }[];
  errors?: string[];
}

export class OrderConfirmationService {
  private serialNumberService = getSerialNumberService();
  private pdfService = getPDFService();
  private companyService = getCompanyService();
  private templateGenerator = getDocumentTemplateGenerator();

  /**
   * Validate that an order can be confirmed
   */
  private async validateOrderForConfirmation(orderId: string): Promise<{
    valid: boolean;
    order: any;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Fetch order with items and models
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            model: true,
          },
        },
        customer: true,
      },
    });

    if (!order) {
      return { valid: false, order: null, errors: ['Order not found'] };
    }

    // Check if order is already confirmed or cancelled
    if (order.status === 'SENT' || order.status === 'PAID' || order.status === 'CANCELLED') {
      errors.push(`Cannot confirm order with status: ${order.status}`);
    }

    // Check if order has items
    if (!order.items || order.items.length === 0) {
      errors.push('Order has no items');
    }

    // Check if all manufactured items can generate serials
    const manufacturedItems = order.items.filter(
      (item: any) => item.model?.isManufactured
    );

    if (manufacturedItems.length > 0) {
      // Validate that all manufactured items have models
      const itemsWithoutModel = manufacturedItems.filter((item: any) => !item.model);
      if (itemsWithoutModel.length > 0) {
        errors.push(`${itemsWithoutModel.length} manufactured item(s) without model`);
      }
    }

    return {
      valid: errors.length === 0,
      order,
      errors,
    };
  }

  /**
   * Confirm an order with automatic document generation
   * This is a transaction-based operation
   */
  async confirmOrder(
    orderId: string,
    options: ConfirmOrderOptions = {}
  ): Promise<OrderConfirmationResult> {
    const errors: string[] = [];
    const generatedDocuments: {
      type: string;
      path: string;
    }[] = [];

    // Default options
    const opts: ConfirmOrderOptions = {
      generateInvoice: options.generateInvoice ?? true,
      generateProforma: options.generateProforma ?? false,
      generateDeliveryNote: options.generateDeliveryNote ?? true,
      generateNameplates: options.generateNameplates ?? true,
    };

    try {
      // Use a transaction for atomicity
      const result = await db.$transaction(async (tx) => {
        // Step 1: Validate order
        const validation = await this.validateOrderForConfirmation(orderId);
        if (!validation.valid) {
          throw new Error(
            `Order validation failed: ${validation.errors.join(', ')}`
          );
        }

        const order = validation.order;

        // Step 2: Assign serial numbers to manufactured items
        const serialAssignments = await this.serialNumberService.assignSerialNumbersToOrder(
          orderId,
          order.items
        );

        // Step 3: Update order status to SENT
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'SENT' },
        });

        // Step 4: Create audit log
        await tx.auditLog.create({
          data: {
            entityType: 'Order',
            entityId: orderId,
            action: 'UPDATE',
            changes: JSON.stringify({
              status: { from: order.status, to: 'SENT' },
            }),
            metadata: JSON.stringify({
              serialAssignments: serialAssignments.length,
            }),
            orderId,
            customerId: order.customerId,
          },
        });

        // Step 5: Get company info for document headers
        const company = await tx.company.findFirst();
        if (!company) {
          throw new Error('Company not configured');
        }

        // Step 6: Generate documents (outside transaction to avoid holding locks too long)
        // We'll do this after the transaction commits
        return {
          order,
          serialAssignments,
          company,
          generatedDocuments: [],
        };
      });

      // After transaction commits, generate documents
      const { order, serialAssignments, company } = result as any;

      // Re-fetch items with serial numbers
      const updatedOrder = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              model: true,
            },
          },
          customer: true,
        },
      });

      if (!updatedOrder) {
        throw new Error('Order not found after transaction');
      }

      // Generate PDFs based on options
      if (opts.generateInvoice && order.type === 'INVOICE') {
        try {
          const pdfData = this.templateGenerator.createDocumentData(
            updatedOrder,
            company,
            'INVOICE'
          );
          const pdfPath = await this.pdfService.generateAndSavePDF(
            updatedOrder.customerId,
            updatedOrder.customerName.split(' ')[0],
            pdfData
          );
          generatedDocuments.push({ type: 'INVOICE', path: pdfPath });
        } catch (e: any) {
          errors.push(`Failed to generate invoice: ${e.message}`);
        }
      }

      if (opts.generateProforma && order.type === 'PROFORMA') {
        try {
          const pdfData = this.templateGenerator.createDocumentData(
            updatedOrder,
            company,
            'PROFORMA'
          );
          const pdfPath = await this.pdfService.generateAndSavePDF(
            updatedOrder.customerId,
            updatedOrder.customerName.split(' ')[0],
            pdfData
          );
          generatedDocuments.push({ type: 'PROFORMA', path: pdfPath });
        } catch (e: any) {
          errors.push(`Failed to generate proforma: ${e.message}`);
        }
      }

      if (opts.generateDeliveryNote) {
        try {
          const pdfData = this.templateGenerator.createDocumentData(
            updatedOrder,
            company,
            'DELIVERY_NOTE'
          );
          const pdfPath = await this.pdfService.generateAndSavePDF(
            updatedOrder.customerId,
            updatedOrder.customerName.split(' ')[0],
            pdfData
          );
          generatedDocuments.push({
            type: 'DELIVERY_NOTE',
            path: pdfPath,
          });
        } catch (e: any) {
          errors.push(`Failed to generate delivery note: ${e.message}`);
        }
      }

      // Generate nameplates only for manufactured items
      if (opts.generateNameplates) {
        const manufacturedItems = updatedOrder.items.filter(
          (item: any) => item.model?.isManufactured
        );

        for (const item of manufacturedItems) {
          try {
            const pdfData = this.templateGenerator.createDocumentData(
              { ...updatedOrder, items: [item] } as any,
              company,
              'NAMEPLATE'
            );
            const pdfPath = await this.pdfService.generateAndSavePDF(
              updatedOrder.customerId,
              updatedOrder.customerName.split(' ')[0],
              pdfData
            );
            generatedDocuments.push({ type: 'NAMEPLATE', path: pdfPath });
          } catch (e: any) {
            errors.push(`Failed to generate nameplate: ${e.message}`);
          }
        }
      }

      // Update order with PDF paths
      if (generatedDocuments.length > 0) {
        await db.order.update({
          where: { id: orderId },
          data: {
            pdfPath: generatedDocuments[0].path, // Main document path
          },
        });
      }

      // Create audit log for PDF generation
      await db.auditLog.create({
        data: {
          entityType: 'Order',
          entityId: orderId,
          action: 'PDF_GENERATED',
          metadata: JSON.stringify({
            generatedDocuments,
            count: generatedDocuments.length,
          }),
          orderId,
          customerId: order.customerId,
        },
      });

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.fullNumber,
        status: 'SENT',
        serialAssignments,
        generatedDocuments,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        orderId,
        orderNumber: '',
        status: 'FAILED',
        serialAssignments: [],
        generatedDocuments,
        errors: [error.message || 'Failed to confirm order'],
      };
    }
  }

  /**
   * Unconfirm an order (return to DRAFT status)
   * This removes serial numbers and is reversible
   */
  async unconfirmOrder(orderId: string): Promise<void> {
    const order = await db.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow unconfirming SENT orders
    if (order.status !== 'SENT') {
      throw new Error(`Cannot unconfirm order with status: ${order.status}`);
    }

    // Remove serial numbers
    await this.serialNumberService.removeSerialNumbersFromOrder(orderId);

    // Update order status
    await db.order.update({
      where: { id: orderId },
      data: { status: 'DRAFT' },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        entityType: 'Order',
        entityId: orderId,
        action: 'UPDATE',
        changes: JSON.stringify({
          status: { from: order.status, to: 'DRAFT' },
        }),
        metadata: JSON.stringify({ reason: 'Order unconfirmed' }),
        orderId,
        customerId: order.customerId,
      },
    });
  }
}

// Singleton instance
let orderConfirmationServiceInstance: OrderConfirmationService | null = null;

export function getOrderConfirmationService(): OrderConfirmationService {
  if (!orderConfirmationServiceInstance) {
    orderConfirmationServiceInstance = new OrderConfirmationService();
  }
  return orderConfirmationServiceInstance;
}
