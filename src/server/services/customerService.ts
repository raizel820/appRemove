/**
 * Customer Service
 * Business logic for customer operations
 */

import { CustomerRepository } from '../repositories/customerRepository';
import { getStorageAdapter } from '../adapters/fsStorage';
import { CreateCustomerInput, UpdateCustomerInput } from '../types';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  /**
   * Create a new customer and associated folder
   */
  async createCustomer(data: CreateCustomerInput) {
    // Check if customer code already exists
    const existingCustomer = await this.customerRepository.findByCode(data.code);
    
    // If code exists and is not deleted, throw error
    if (existingCustomer && !existingCustomer.deletedAt) {
      throw new Error('Customer code already exists');
    }
    
    // If code exists but was soft-deleted, permanently delete it first
    if (existingCustomer && existingCustomer.deletedAt) {
      await this.customerRepository.delete(existingCustomer.id);
    }

    // Create customer in database
    const customer = await this.customerRepository.create({
      code: data.code,
      fullName: data.fullName,
      shortName: data.shortName,
      address: data.address,
      city: data.city,
      country: data.country,
      phone: data.phone,
      email: data.email,
      nif: data.nif,
      nis: data.nis,
      rib: data.rib,
      rcn: data.rcn,
      notes: data.notes,
    });

    // Create customer folder on filesystem
    try {
      const storage = getStorageAdapter();
      const folderPath = await storage.createCustomerFolder(
        customer.id,
        customer.fullName
      );
      // Note: folderPath is managed by filesystem but not stored in DB
      return customer;
    } catch (error) {
      // Rollback: delete customer if folder creation fails
      await this.customerRepository.delete(customer.id);
      throw new Error(`Failed to create customer folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(id: string) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  /**
   * Get all customers with optional search
   */
  async getCustomers(search?: string) {
    return this.customerRepository.findAll({ search });
  }

  /**
   * Update a customer
   */
  async updateCustomer(id: string, data: UpdateCustomerInput) {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // If code is being updated, check if new code already exists
    if (data.code && data.code !== existingCustomer.code) {
      const existingWithCode = await this.customerRepository.findByCode(data.code);
      if (existingWithCode && existingWithCode.id !== id) {
        throw new Error('Customer code already in use');
      }
    }

    return this.customerRepository.update(id, data);
  }

  /**
   * Soft delete a customer
   */
  async deleteCustomer(id: string) {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error('Customer not found');
    }

    return this.customerRepository.softDelete(id);
  }

  /**
   * Restore a deleted customer
   */
  async restoreCustomer(id: string) {
    const customer = await this.customerRepository.findById(id, true);
    if (!customer || !customer.deletedAt) {
      throw new Error('Customer not found or not deleted');
    }

    return this.customerRepository.restore(id);
  }

  /**
   * Search customers
   */
  async searchCustomers(query: string) {
    return this.customerRepository.findAll({ search: query });
  }
}

// Singleton instance
let customerServiceInstance: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!customerServiceInstance) {
    customerServiceInstance = new CustomerService();
  }
  return customerServiceInstance;
}
