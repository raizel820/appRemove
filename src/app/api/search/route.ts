
/**
 * POST /api/search
 * Global full-text search across customers, orders, and serial numbers
 */

import { getSearchService, SearchOptions, SearchResult } from '@/server/services/searchService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        results: [],
        message: 'Please provide a search query',
      });
    }

    const searchService = getSearchService();
    const options: SearchOptions = {
      query,
      limit: body.limit || 50,
    };

    const results = await searchService.search(options);

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error performing search:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to perform search',
      },
      { status: 500 }
    );
  }
}
