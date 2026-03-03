/**
 * Shared Types for Invoice App
 */

export enum OrderType {
  INVOICE = 'INVOICE',
  PROFORMA = 'PROFORMA',
  DELIVERY_NOTE = 'DELIVERY_NOTE',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  PDF_GENERATED = 'PDF_GENERATED',
  EMAIL_SENT = 'EMAIL_SENT',
}

export interface Customer {
  id: string;
  code: string;
  fullName: string;
  shortName: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineFamily {
  id: string;
  name: string;
  description?: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineModel {
  id: string;
  familyId: string;
  name: string;
  code: string;
  description?: string;
  basePrice?: number;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  modelId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  serialNumbers?: string[];
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  type: OrderType;
  numberYear: number;
  numberSequence: number;
  fullNumber: string;
  customerId: string;
  customerName: string;
  date: Date;
  dueDate?: Date;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  pdfPath?: string;
  documentLanguage: string;
  payments?: Payment[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItem[];
}

export interface Payment {
  date: Date;
  amount: number;
  method?: string;
  notes?: string;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  logo?: string;
  currency: string;
  defaultLanguage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerInput {
  code: string;
  fullName: string;
  shortName: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  code?: string;
  fullName?: string;
  shortName?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  notes?: string;
}

export interface CreateOrderInput {
  type: OrderType;
  customerId: string;
  customerName: string;
  date: Date;
  dueDate?: Date;
  currency?: string;
  notes?: string;
  documentLanguage?: string;
  items: CreateOrderItemInput[];
}

export interface CreateOrderItemInput {
  modelId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  specifications?: Record<string, any>;
}

export interface UpdateOrderInput {
  dueDate?: Date;
  status?: OrderStatus;
  notes?: string;
  currency?: string;
  taxRate?: number;
  items?: UpdateOrderItemInput[];
}

export interface UpdateOrderItemInput {
  id?: string;
  modelId?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  specifications?: Record<string, any>;
}

export interface SerialNumberOptions {
  globalCounter: number;
  year: number;
  month: number;
  modelCode: string;
  isCustomized?: boolean;
  version?: number;
}

export interface SearchParams {
  query?: string;
  type?: OrderType;
  status?: OrderStatus;
  customerId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}


// src/server/types/index.ts
export type SpecKeyValue = { key: string; value: string };

export type ModelSpecs = {
  mechanical?: Record<string, any>;
  electrical?: Record<string, any>;
  physical?: Record<string, any>;
};
