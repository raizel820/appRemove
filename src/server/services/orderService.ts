/**
 * Order Service
 * Business logic for order operations with order number reservation system
 */

import { OrderRepository } from '../repositories/orderRepository';
import { getOrderNumberRepository } from '../repositories/orderNumberRepository';
import { formatOrderNumber } from '../utils/orderNumberFormatter';
import { CreateOrderInput, UpdateOrderInput, OrderType } from '../types';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getInvoiceNumberingService } from './invoiceNumberingService';
import { getProformaNumberingService } from './proformaNumberingService';
import { getPurchaseOrderNumberingService } from './purchaseOrderNumberingService';
import { getDeliveryNoteNumberingService } from './deliveryNoteNumberingService';
import { getYearAwareOrderNumberingService } from './yearAwareOrderNumberingService';

/**
 * Helper function to fetch and prepare snapshot data for order creation
 */
async function prepareSnapshotData(customerId: string, itemModelIds: (string | undefined)[]): Promise<{
  snapshotCompany: string;
  snapshotCustomer: string;
  snapshotPdfConfig: string;
  modelSnapshots: Map<string, string>;
}> {
  // Fetch company data
  const company = await db.company.findFirst({
    include: {
      logos: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  // Fetch customer data
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });

  // Fetch PDF configuration
  const pdfConfig = await db.pDFConfiguration.findFirst();

  // Fetch machine model data for all items
  const modelIds = itemModelIds.filter((id): id is string => !!id);
  const models = modelIds.length > 0 ? await db.machineModel.findMany({
    where: { id: { in: modelIds } },
    include: { family: true },
  }) : [];

  // Create a map of model ID to snapshot
  const modelSnapshots = new Map<string, string>();
  for (const model of models) {
    modelSnapshots.set(model.id, JSON.stringify({
      id: model.id,
      name: model.name,
      code: model.code,
      description: model.description,
      basePrice: model.basePrice,
      currency: model.currency,
      isManufactured: model.isManufactured,
      family: model.family ? {
        id: model.family.id,
        name: model.family.name,
        code: model.family.code,
      } : null,
    }));
  }

  return {
    snapshotCompany: JSON.stringify(company || {}),
    snapshotCustomer: JSON.stringify(customer || {}),
    snapshotPdfConfig: JSON.stringify(pdfConfig || {}),
    modelSnapshots,
  };
}

export class OrderService {
  private orderRepository: OrderRepository;
  private orderNumberRepository = getOrderNumberRepository();

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  /**
   * Create a new order with auto-generated number (legacy - uses old system)
   * DEPRECATED: Use reservation-based flow instead
   */
  async createOrder(data: CreateOrderInput) {
    const now = new Date();
    const year = now.getFullYear();

    // Get next sequence number (legacy method - will be replaced)
    const sequence = await this.orderRepository.getNextSequenceNumber(year);
    const fullNumber = formatOrderNumber({ year, sequence });

    // Calculate totals
    const itemsWithTotals = data.items.map(item => ({
      ...item,
      totalPrice: (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100),
    }));

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0; // Default tax rate, can be customized
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Prepare snapshot data
    const modelIds = data.items.map(item => item.modelId);
    const snapshots = await prepareSnapshotData(data.customerId, modelIds);

    // Create order with items
    const order = await this.orderRepository.create({
      type: data.type,
      numberYear: year,
      numberSequence: sequence,
      fullNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      date: data.date,
      dueDate: data.dueDate,
      status: 'DRAFT',
      currency: data.currency || 'EUR',
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: data.notes,
      documentLanguage: data.documentLanguage || 'fr',
      // Snapshot fields
      snapshotCompany: snapshots.snapshotCompany,
      snapshotCustomer: snapshots.snapshotCustomer,
      snapshotPdfConfig: snapshots.snapshotPdfConfig,
      items: {
        create: itemsWithTotals.map(item => ({
          modelId: item.modelId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: item.totalPrice,
          specifications: item.specifications ? JSON.stringify(item.specifications) : null,
          // Snapshot for model
          snapshotModel: item.modelId ? snapshots.modelSnapshots.get(item.modelId) || null : null,
        })),
      },
    });

    return order;
  }

  /**
   * Create a new order with reservation-based number
   * NEW: Uses the new order number reservation system
   */
  async createOrderWithReservation(
    data: CreateOrderInput,
    orderNumber: number,
    reservationId: string
  ) {
    const now = new Date();
    const year = now.getFullYear();

    // Claim the reservation (transition RESERVED -> USED)
    await this.orderNumberRepository.claimReservation(orderNumber, reservationId);

    // Calculate sequence from order number (for backward compatibility)
    const sequence = orderNumber;
    const fullNumber = formatOrderNumber({ year, sequence });

    // Calculate totals
    const itemsWithTotals = data.items.map(item => ({
      ...item,
      totalPrice: (item.unitPrice * item.quantity) * (1 - (item.discount || 0) / 100),
    }));

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0; // Default tax rate, can be customized
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Prepare snapshot data
    const modelIds = data.items.map(item => item.modelId);
    const snapshots = await prepareSnapshotData(data.customerId, modelIds);

    // Create order with items and orderNumber reference
    const order = await this.orderRepository.create({
      type: data.type,
      orderNumber,
      numberYear: year,
      numberSequence: sequence,
      fullNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      date: data.date,
      dueDate: data.dueDate,
      status: 'DRAFT',
      currency: data.currency || 'EUR',
      subtotal,
      taxRate,
      taxAmount,
      total,
      notes: data.notes,
      documentLanguage: data.documentLanguage || 'fr',
      // Snapshot fields
      snapshotCompany: snapshots.snapshotCompany,
      snapshotCustomer: snapshots.snapshotCustomer,
      snapshotPdfConfig: snapshots.snapshotPdfConfig,
      items: {
        create: itemsWithTotals.map(item => ({
          modelId: item.modelId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: item.totalPrice,
          specifications: item.specifications ? JSON.stringify(item.specifications) : null,
          // Snapshot for model
          snapshotModel: item.modelId ? snapshots.modelSnapshots.get(item.modelId) || null : null,
        })),
      },
    });

    return order;
  }

  /**
   * Get an order by ID
   */
  async getOrder(id: string) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }
    return order;
  }

  /**
   * Get all orders with optional filters
   */
  async getOrders(filters?: {
    type?: OrderType;
    status?: string;
    customerId?: string;
    year?: number;
    search?: string;
  }) {
    return this.orderRepository.findAll({
      type: filters?.type,
      status: filters?.status as any,
      customerId: filters?.customerId,
      year: filters?.year,
      search: filters?.search,
    });
  }

  /**
   * Update an order
   */
  async updateOrder(id: string, data: UpdateOrderInput) {
    const existingOrder = await this.orderRepository.findById(id);
    if (!existingOrder) {
      throw new Error('Order not found');
    }

    // If items are being updated, recalculate totals
    let updateData: Prisma.OrderUpdateInput = {};

    if (data.items) {
      // Prepare snapshot data for models
      const modelIds = data.items.map(item => item.modelId).filter((id): id is string => !!id);
      const snapshots = await prepareSnapshotData(data.customerId || existingOrder.customerId, modelIds);

      const itemsWithTotals = data.items.map(item => {
        // Calculate totalPrice as (quantity * unitPrice) - discount (where discount is an absolute amount)
        const lineTotal = (item.quantity || 1) * item.unitPrice - (item.discount || 0);

        return {
          modelId: item.modelId,
          description: item.description!,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: lineTotal,
          specifications: item.specifications ? JSON.stringify(item.specifications) : null,
          snapshotModel: item.modelId ? snapshots.modelSnapshots.get(item.modelId) || null : null,
        };
      });

      const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = data.taxRate !== undefined ? data.taxRate : existingOrder.taxRate;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.total = total;
    }

    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.documentLanguage !== undefined) updateData.documentLanguage = data.documentLanguage;
    if (data.customerId !== undefined) {
      updateData.customerId = data.customerId;
      updateData.customerName = data.customerId ? (existingOrder.customerName) : null;
    }
    if (data.activityProfileId !== undefined) {
      updateData.activityProfileId = data.activityProfileId || null;
    }

    // Update order basic fields
    const updatedOrder = await this.orderRepository.update(id, updateData);

    // Update items if provided
    if (data.items) {
      // Prepare snapshot data for models
      const modelIds = data.items.map(item => item.modelId).filter((id): id is string => !!id);
      const snapshots = await prepareSnapshotData(data.customerId || existingOrder.customerId, modelIds);

      const itemsData = data.items.map(item => {
        // Calculate totalPrice as (quantity * unitPrice) - discount (where discount is an absolute amount)
        const lineTotal = (item.quantity || 1) * item.unitPrice - (item.discount || 0);

        return {
          modelId: item.modelId,
          description: item.description!,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: lineTotal,
          specifications: item.specifications ? JSON.stringify(item.specifications) : null,
          snapshotModel: item.modelId ? snapshots.modelSnapshots.get(item.modelId) || null : null,
        };
      });

      return await this.orderRepository.updateItems(id, itemsData);
    }

    return updatedOrder;
  }

  /**
   * Soft delete an order with option to allow or block number reuse
   * Also deletes the associated verification token
   * @param id - Order ID
   * @param allowReuse - If true, mark order number as reusable. If false, mark as blocked.
   * @param allowInvoiceReuse - If true, mark invoice number as reusable. If false, mark as blocked.
   * @param allowProformaReuse - If true, mark proforma number as reusable. If false, mark as blocked.
   * @param allowPurchaseOrderReuse - If true, mark purchase order number as reusable. If false, mark as blocked.
   * @param allowDeliveryNoteReuse - If true, mark delivery note number as reusable. If false, mark as blocked.
   */
  async deleteOrder(
    id: string,
    allowReuse: boolean = false,
    allowInvoiceReuse: boolean = false,
    allowProformaReuse: boolean = false,
    allowPurchaseOrderReuse: boolean = false,
    allowDeliveryNoteReuse: boolean = false
  ) {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    // Debug logging
    console.log('Deleting order with ID:', id);
    console.log('Order number fields:', {
      numberYear: order.numberYear,
      numberSequence: order.numberSequence,
    });
    console.log('Invoice number fields:', {
      invoiceFullNumber: order.invoiceFullNumber,
      invoiceYear: order.invoiceYear,
      invoiceSequence: order.invoiceSequence,
    });
    console.log('Proforma number fields:', {
      proformaFullNumber: order.proformaFullNumber,
      proformaYear: order.proformaYear,
      proformaSequence: order.proformaSequence,
    });
    console.log('Purchase order number fields:', {
      purchaseOrderFullNumber: order.purchaseOrderFullNumber,
      purchaseOrderYear: order.purchaseOrderYear,
      purchaseOrderSequence: order.purchaseOrderSequence,
    });
    console.log('Delivery note number fields:', {
      deliveryNoteFullNumber: order.deliveryNoteFullNumber,
      deliveryNoteYear: order.deliveryNoteYear,
      deliveryNoteSequence: order.deliveryNoteSequence,
    });

    // Get the year-aware order numbering service
    const yearAwareService = getYearAwareOrderNumberingService();

    // Handle year-based order number (new system - OrderNumbers table)
    // This is the primary system used for order numbers
    if (order.numberYear && order.numberSequence) {
      try {
        if (allowReuse) {
          console.log(`Marking order number ${order.numberSequence}/${order.numberYear} as reusable`);
          await yearAwareService.markNumberReusable(order.numberSequence, order.numberYear);
        } else {
          console.log(`Blocking order number ${order.numberSequence}/${order.numberYear}`);
          await yearAwareService.blockNumber(order.numberSequence, order.numberYear);
        }
      } catch (error) {
        console.error(`Error updating order number state for ${order.numberSequence}/${order.numberYear}:`, error);
        // Continue with deletion even if number state update fails
      }
    }

    // Also handle old orderNumber reference (legacy system - OrderNumber table)
    // Keep for backward compatibility
    if (order.orderNumber) {
      try {
        if (allowReuse) {
          await this.orderNumberRepository.markNumberReusable(order.orderNumber);
        } else {
          await this.orderNumberRepository.blockNumber(order.orderNumber);
        }
      } catch (error) {
        console.error(`Error updating legacy order number state for ${order.orderNumber}:`, error);
        // Continue with deletion even if number state update fails
      }
    }

    // Handle invoice number if the order has one
    if (order.invoiceFullNumber != null && order.invoiceYear != null && order.invoiceSequence != null) {
      console.log(`Processing invoice number ${order.invoiceSequence}/${order.invoiceYear}, allowInvoiceReuse: ${allowInvoiceReuse}`);
      const invoiceService = getInvoiceNumberingService();
      try {
        if (allowInvoiceReuse) {
          console.log(`Marking invoice number ${order.invoiceSequence}/${order.invoiceYear} as reusable`);
          await invoiceService.markNumberReusable(order.invoiceSequence, order.invoiceYear);
        } else {
          console.log(`Blocking invoice number ${order.invoiceSequence}/${order.invoiceYear}`);
          await invoiceService.blockNumber(order.invoiceSequence, order.invoiceYear);
        }
      } catch (error) {
        console.error(`Error updating invoice number state for ${order.invoiceSequence}/${order.invoiceYear}:`, error);
        // Continue with deletion even if number state update fails
      }
    } else {
      console.log('Skipping invoice number - fields not populated');
    }

    // Handle proforma number if the order has one
    if (order.proformaFullNumber != null && order.proformaYear != null && order.proformaSequence != null) {
      console.log(`Processing proforma number ${order.proformaSequence}/${order.proformaYear}, allowProformaReuse: ${allowProformaReuse}`);
      const proformaService = getProformaNumberingService();
      try {
        if (allowProformaReuse) {
          console.log(`Marking proforma number ${order.proformaSequence}/${order.proformaYear} as reusable`);
          await proformaService.markNumberReusable(order.proformaSequence, order.proformaYear);
        } else {
          console.log(`Blocking proforma number ${order.proformaSequence}/${order.proformaYear}`);
          await proformaService.blockNumber(order.proformaSequence, order.proformaYear);
        }
      } catch (error) {
        console.error(`Error updating proforma number state for ${order.proformaSequence}/${order.proformaYear}:`, error);
        // Continue with deletion even if number state update fails
      }
    } else {
      console.log('Skipping proforma number - fields not populated');
    }

    // Handle purchase order number if the order has one
    if (order.purchaseOrderFullNumber != null && order.purchaseOrderYear != null && order.purchaseOrderSequence != null) {
      console.log(`Processing purchase order number ${order.purchaseOrderSequence}/${order.purchaseOrderYear}, allowPurchaseOrderReuse: ${allowPurchaseOrderReuse}`);
      const purchaseOrderService = getPurchaseOrderNumberingService();
      try {
        if (allowPurchaseOrderReuse) {
          console.log(`Marking purchase order number ${order.purchaseOrderSequence}/${order.purchaseOrderYear} as reusable`);
          await purchaseOrderService.markNumberReusable(order.purchaseOrderSequence, order.purchaseOrderYear);
        } else {
          console.log(`Blocking purchase order number ${order.purchaseOrderSequence}/${order.purchaseOrderYear}`);
          await purchaseOrderService.blockNumber(order.purchaseOrderSequence, order.purchaseOrderYear);
        }
      } catch (error) {
        console.error(`Error updating purchase order number state for ${order.purchaseOrderSequence}/${order.purchaseOrderYear}:`, error);
        // Continue with deletion even if number state update fails
      }
    } else {
      console.log('Skipping purchase order number - fields not populated');
    }

    // Handle delivery note number if the order has one
    if (order.deliveryNoteFullNumber != null && order.deliveryNoteYear != null && order.deliveryNoteSequence != null) {
      console.log(`Processing delivery note number ${order.deliveryNoteSequence}/${order.deliveryNoteYear}, allowDeliveryNoteReuse: ${allowDeliveryNoteReuse}`);
      const deliveryNoteService = getDeliveryNoteNumberingService();
      try {
        if (allowDeliveryNoteReuse) {
          console.log(`Marking delivery note number ${order.deliveryNoteSequence}/${order.deliveryNoteYear} as reusable`);
          await deliveryNoteService.markNumberReusable(order.deliveryNoteSequence, order.deliveryNoteYear);
        } else {
          console.log(`Blocking delivery note number ${order.deliveryNoteSequence}/${order.deliveryNoteYear}`);
          await deliveryNoteService.blockNumber(order.deliveryNoteSequence, order.deliveryNoteYear);
        }
      } catch (error) {
        console.error(`Error updating delivery note number state for ${order.deliveryNoteSequence}/${order.deliveryNoteYear}:`, error);
        // Continue with deletion even if number state update fails
      }
    } else {
      console.log('Skipping delivery note number - fields not populated');
    }

    // Soft delete the order and its verification token
    return await db.$transaction(async (tx) => {
      // Delete the associated verification token if it exists
      const tokenLabel = `order-${order.fullNumber}`;
      try {
        await tx.verificationToken.deleteMany({
          where: {
            label: tokenLabel
          }
        });
        console.log(`Deleted verification token for order ${order.fullNumber}`);
      } catch (tokenError) {
        // Log error but don't fail the order deletion
        console.error(`Error deleting verification token for order ${order.fullNumber}:`, tokenError);
      }

      // Soft delete the order
      // Update order's numberReuseAllowed and invoiceNumberReuseAllowed flags for audit
      const deletedOrder = await tx.order.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          numberReuseAllowed: allowReuse,
        },
      });

      return deletedOrder;
    });
  }

  /**
   * Restore a deleted order
   */
  async restoreOrder(id: string) {
    const order = await this.orderRepository.findById(id, true);
    if (!order || !order.deletedAt) {
      throw new Error('Order not found or not deleted');
    }

    return this.orderRepository.restore(id);
  }

  /**
   * Search orders
   */
  async searchOrders(query: string) {
    return this.orderRepository.findAll({ search: query });
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(customerId: string) {
    return this.orderRepository.findAll({ customerId });
  }

  /**
   * Get orders by type and year
   */
  async getOrdersByTypeAndYear(type: OrderType, year: number) {
    return this.orderRepository.findAll({ type, year });
  }
}

// Singleton instance
let orderServiceInstance: OrderService | null = null;

export function getOrderService(): OrderService {
  if (!orderServiceInstance) {
    orderServiceInstance = new OrderService();
  }
  return orderServiceInstance;
}
