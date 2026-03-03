/**
 * Global Search Service
 * Full-text search across customers, orders, and serial numbers using SQLite FTS5
 */

import { db } from '@/lib/db';

export interface SearchResult {
  type: 'customer' | 'order' | 'serial';
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  relevance?: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  types?: ('customer' | 'order' | 'serial')[];
}

export class SearchService {
  /**
   * Perform global search using FTS5
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const query = options.query?.trim() || '';
    if (query.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];
    const limit = options.limit || 50;

    // Search customers using FTS5
    const customerResults = await this.searchCustomers(query, limit);
    results.push(...customerResults);

    // Search orders using FTS5
    const orderResults = await this.searchOrders(query, limit);
    results.push(...orderResults);

    // Search serial numbers
    const serialResults = await this.searchSerials(query, limit);
    results.push(...serialResults);

    // Sort by relevance and limit
    return results.slice(0, limit);
  }

  /**
   * Search customers
   */
  private async searchCustomers(query: string, limit: number): Promise<SearchResult[]> {
    // Check if FTS5 table exists
    const tableExists = await this.checkTableExists('CustomerSearch_fts');
    if (!tableExists) {
      return [];
    }

    // Use raw SQL for FTS5 search
    const rawQuery = `
      SELECT
        c.id,
        c.fullName,
        c.shortName,
        c.email,
        c.phone,
        bm25(c.fullName) as relevance
      FROM CustomerSearch_fts c
      JOIN Customer c ON c.id = c.customerId
      WHERE CustomerSearch_fts MATCH ?
      ORDER BY bm25(c.fullName) DESC
      LIMIT ?
    `;

    const results = await db.$queryRawUnsafe(rawQuery, [query, limit]);

    return results.map((row: any) => ({
      type: 'customer' as const,
      id: row.id,
      title: row.fullName,
      subtitle: `${row.shortName} • ${row.email || row.phone || 'No contact'}`,
      url: `/customers/${row.id}`,
      relevance: row.relevance,
    }));
  }

  /**
   * Search orders
   */
  private async searchOrders(query: string, limit: number): Promise<SearchResult[]> {
    const tableExists = await this.checkTableExists('OrderSearch_fts');
    if (!tableExists) {
      return [];
    }

    const rawQuery = `
      SELECT
        o.id,
        o.fullNumber,
        o.type,
        o.customerName,
        o.total,
        o.currency,
        o.status,
        o.date,
        bm25(o.fullNumber || o.customerName) as relevance
      FROM OrderSearch_fts o
      JOIN \`Order\` o ON o.id = o.orderId
      WHERE OrderSearch_fts MATCH ?
      ORDER BY bm25(o.fullNumber || o.customerName) DESC
      LIMIT ?
    `;

    const results = await db.$queryRawUnsafe(rawQuery, [query, limit]);

    return results.map((row: any) => ({
      type: 'order' as const,
      id: row.id,
      title: `${row.fullNumber} - ${row.type.replace('_', ' ')}`,
      subtitle: `${row.customerName} • ${new Date(row.date).toLocaleDateString()} • ${row.status.replace('_', ' ')}`,
      description: `${row.total.toFixed(2)} ${row.currency}`,
      url: `/orders/${row.id}`,
      relevance: row.relevance,
    }));
  }

  /**
   * Search serial numbers
   */
  private async searchSerials(query: string, limit: number): Promise<SearchResult[]> {
    const tableExists = await this.checkTableExists('SerialSearch_fts');
    if (!tableExists) {
      return [];
    }

    const rawQuery = `
      SELECT
        s.id,
        s.serialNumber,
        s.orderId,
        s.orderNumber,
        o.type,
        o.status,
        bm25(s.serialNumber) as relevance
      FROM SerialSearch_fts s
      JOIN OrderItem oi ON s.orderItemId = oi.id
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE SerialSearch_fts MATCH ?
      ORDER BY bm25(s.serialNumber) DESC
      LIMIT ?
    `;

    const results = await db.$queryRawUnsafe(rawQuery, [query, limit]);

    return results.map((row: any) => ({
      type: 'serial' as const,
      id: row.orderId,
      title: `Serial: ${row.serialNumber}`,
      subtitle: `${row.orderNumber} • ${row.type.replace('_', ' ')} • ${row.status.replace('_', ' ')}`,
      description: `Order: ${row.orderNumber}`,
      url: `/orders/${row.orderId}`,
      relevance: row.relevance,
    }));
  }

  /**
   * Check if FTS5 table exists
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    const result = await db.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`,
      [tableName]
    );

    return (result as any[]).length > 0;
  }

  /**
   * Rebuild FTS5 search tables (should be called when data changes)
   */
  async rebuildSearchIndexes(): Promise<void> {
    // Rebuild customer search
    await db.$executeRawUnsafe(`
      INSERT INTO CustomerSearch_fts(rowid, customerId, fullName, shortName, email, phone, createdAt)
      SELECT rowid, id, fullName, shortName, email, phone, createdAt
      FROM Customer
      WHERE deletedAt IS NULL
    `);

    // Rebuild order search
    await db.$executeRawUnsafe(`
      INSERT INTO OrderSearch_fts(rowid, orderId, type, fullNumber, customerName, status, total, currency, date, createdAt)
      SELECT rowid, id, type, fullNumber, customerName, status, total, currency, date, createdAt
      FROM \`Order\`
      WHERE deletedAt IS NULL
    `);

    // Rebuild serial search
    await db.$executeRawUnsafe(`
      INSERT INTO SerialSearch_fts(rowid, orderItemId, orderId, serialNumber, description, createdAt)
      SELECT rowid, oi.id, o.id, o.fullNumber, oi.serialNumbers, oi.description, o.createdAt
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      WHERE o.deletedAt IS NULL
      AND oi.serialNumbers IS NOT NULL
    `);
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(): SearchService {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService();
  }
  return searchServiceInstance;
}
