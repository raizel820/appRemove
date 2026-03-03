import { CURRENCIES, convertPrice, formatPrice } from "@/lib/currencyUtils";
import { currencyToWords, formatTimePeriod } from "@/lib/numberToWords";
import { 
  type QRCodeConfig, 
  type QRCodeData, 
  type CompanyInfo, 
  type CustomerInfo, 
  type FileInfo, 
  type ItemData,
  generateQRCodeData, 
  generateQRCodeDataURL 
} from "@/lib/qrCodeUtils";
import type { ExchangeRate } from "@/lib/currencyUtils";

// --- Interfaces ---
export interface Company {
  id: string;
  name: string;
  phoneNumbers?: string[];
  faxNumbers?: string[];
  emails?: string[];
  address?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  rcn?: string;
  bankName?: string;
  fundCapital?: number;
  activityDescriptionAr?: string;
  activityDescriptionFr?: string;
  activeLogoId?: string;
  city?: string; // Added based on usage
  currency?: string; // Added based on usage
  logos?: Array<{
    id: string;
    filename: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    isActive: boolean;
    createdAt: string;
    url: string;
  }>;
}

export interface Customer {
  id: string;
  fullName: string;
  shortName?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  nif?: string;
  nis?: string;
  rcn?: string;
  rib?: string;
}

export interface CompanyProfile {
  id: string;
  profileNumber: number;
  profileName: string;
  nif?: string;
  nis?: string;
  rcn?: string;
  rib?: string;
  bankName?: string;
  fundCapital?: number;
  isActive: boolean;
}

export interface MachineModel {
  id: string;
  name: string;
  code?: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  isManufactured?: boolean;
  family?: {
    id: string;
    name: string;
  };
}

export interface PDFConfiguration {
  id: string;
  // ... (Include all properties from the original file)
  descriptionLanguage: "FRENCH" | "ENGLISH";
  includeTelephone: boolean;
  includeFax: boolean;
  includeAddress: boolean;
  includeEmail: boolean;
  includeRcn: boolean;
  includeNif: boolean;
  includeNis: boolean;
  includeRib: boolean;
  includeBankName: boolean;
  includeCapitalSocial: boolean;
  includeArabicDescription: boolean;
  includeFrenchDescription: boolean;
  headerLineSpacing: number;
  companyNameFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  companyNameFontSize: number;
  companyNameTextColor: string;
  companyNameLineSpacing: number;
  descriptionFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  descriptionFontSize: number;
  descriptionTextColor: string;
  descriptionLineSpacing: number;
  logoScaling: number;
  logoOffsetX: number;
  logoOffsetY: number;
  labelFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  labelFontSize: number;
  labelTextColor: string;
  labelLineSpacing: number;
  dataFontFamily: "HELVETICA" | "TIMES_ROMAN" | "COURIER" | "ARIAL";
  dataFontSize: number;
  dataTextColor: string;
  dataLineSpacing: number;
  leftPartDirection: "LTR" | "RTL";
  rightPartDirection: "LTR" | "RTL";
  [key: string]: any; // Allow index signature for dynamic access
}

// --- Pagination Interfaces ---
interface RowMeasurement {
  height: number;
  isEmptyRow: boolean;
  originalIndex: number;
}

interface RowLayoutData {
  text: string;
  fontFamily: string;
  fontSize: number;
  cellWidths: number[];
}

interface PageDescriptor {
  pageNum: number;
  pageType: 'single' | 'multi-first' | 'multi-non-last' | 'multi-last';
  itemsTableMaxHeight: number;
  itemsTableHeightUsed: number;
  rows: RowMeasurement[];
  realItemsCount: number;
  emptyRowsCount: number;
}

interface PaginationSettings {
  singlePageItemsMaxHeight_mm: number;
  multiPageFirstMaxHeight_mm: number;
  multiPageNonLastMaxHeight_mm: number;
  multiPageLastMaxHeight_mm: number;
  summaryTermsHeight_mm: number;
  pageMargin_mm: number;
  a4Height_mm: number;
}

// --- Helper Functions ---

export const getTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

// Technical files don't have numbers - placeholder function for compatibility
export const getTechnicalFileNumber = (): string => {
  return "1";
};

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
};

// --- Measurement & Pagination Logic ---

const MM_PER_INCH = 25.4;
const PX_PER_INCH = 96;
const mmToPx = (mm: number): number => (mm / MM_PER_INCH) * PX_PER_INCH;
const pxToMm = (px: number): number => (px / PX_PER_INCH) * MM_PER_INCH;

// Cache for text measurement
const textMeasurementCache = new Map<string, { width: number; height: number; lines: number }>();

const measureTextHeight = (text: string, fontFamily: string, fontSize: number, maxWidthPx: number): { width: number; height: number; lines: number } => {
  const cacheKey = `${fontFamily}|${fontSize}|${maxWidthPx}|${text}`;
  const cached = textMeasurementCache.get(cacheKey);
  if (cached) return cached;

  if (typeof document === 'undefined') return { width: 0, height: 8, lines: 1 };

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: 0, height: 8, lines: 1 };

  ctx.font = `${fontSize}px ${fontFamily}`;
  const lineHeightPx = fontSize * 1.2;

  const words = text.split(/\s+/);
  let lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width <= maxWidthPx || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  lines = lines.flatMap(line => {
    const metrics = ctx.measureText(line);
    if (metrics.width <= maxWidthPx) return [line];
    const avgCharWidth = metrics.width / Math.max(line.length, 1);
    const maxChars = Math.max(1, Math.floor(maxWidthPx / avgCharWidth));
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += maxChars) {
      chunks.push(line.slice(i, i + maxChars));
    }
    return chunks;
  });

  const linesCount = Math.max(1, lines.length);
  const widthPx = Math.min(...lines.map(l => ctx.measureText(l).width), maxWidthPx);
  const heightPx = linesCount * lineHeightPx;

  const result = { width: widthPx, height: heightPx, lines: linesCount };
  textMeasurementCache.set(cacheKey, result);
  return result;
};

const measureRowHeight = (rowData: RowLayoutData, isEmptyRow: boolean): RowMeasurement => {
  if (isEmptyRow) {
    return { height: 8, isEmptyRow: true, originalIndex: -1 };
  }
  const { text, fontFamily, fontSize, cellWidths } = rowData;
  const maxColumnWidthMm = Math.max(...cellWidths);
  const maxWidthPx = mmToPx(maxColumnWidthMm);
  const { height: heightPx } = measureTextHeight(text, fontFamily, fontSize, maxWidthPx);
  const totalHeightPx = heightPx + 8;
  return { height: pxToMm(totalHeightPx), isEmptyRow: false, originalIndex: -1 };
};

const getPaginationSettings = (config: PDFConfiguration): PaginationSettings => {
  const settings = {
    singlePageItemsMaxHeight_mm: config?.technicalFileSinglePageTableMaxHeight || 200,
    multiPageFirstMaxHeight_mm: config?.technicalFileFirstPageTableMaxHeight || 180,
    multiPageNonLastMaxHeight_mm: config?.technicalFileOtherPagesTableMaxHeight || 180,
    multiPageLastMaxHeight_mm: config?.technicalFileLastPageTableMaxHeight || 150,
    summaryTermsHeight_mm: 50,
    pageMargin_mm: 10,
    a4Height_mm: 297,
  };
  console.log('[getPaginationSettings - TechnicalFile] Config values:', {
    technicalFileSinglePageTableMaxHeight: config?.technicalFileSinglePageTableMaxHeight,
    technicalFileFirstPageTableMaxHeight: config?.technicalFileFirstPageTableMaxHeight,
    technicalFileOtherPagesTableMaxHeight: config?.technicalFileOtherPagesTableMaxHeight,
    technicalFileLastPageTableMaxHeight: config?.technicalFileLastPageTableMaxHeight,
  });
  console.log('[getPaginationSettings - TechnicalFile] Resulting settings:', settings);
  return settings;
};

const validatePaginationSettings = (settings: PaginationSettings, items: RowMeasurement[]): { valid: boolean; error?: string } => {
  const MIN_ROW_HEIGHT_MM = 8;
  const MIN_MAX_HEIGHT_MM = 30;

  // Validate minimum heights
  if (settings.multiPageLastMaxHeight_mm < MIN_MAX_HEIGHT_MM) {
    return { valid: false, error: `Last page max height (${settings.multiPageLastMaxHeight_mm}mm) is too small (minimum ${MIN_MAX_HEIGHT_MM}mm).` };
  }
  if (settings.multiPageFirstMaxHeight_mm < MIN_MAX_HEIGHT_MM) {
    return { valid: false, error: `First page max height (${settings.multiPageFirstMaxHeight_mm}mm) is too small (minimum ${MIN_MAX_HEIGHT_MM}mm).` };
  }
  if (settings.multiPageNonLastMaxHeight_mm < MIN_MAX_HEIGHT_MM) {
    return { valid: false, error: `Other pages max height (${settings.multiPageNonLastMaxHeight_mm}mm) is too small (minimum ${MIN_MAX_HEIGHT_MM}mm).` };
  }
  if (settings.singlePageItemsMaxHeight_mm < MIN_MAX_HEIGHT_MM) {
    return { valid: false, error: `Single page max height (${settings.singlePageItemsMaxHeight_mm}mm) is too small (minimum ${MIN_MAX_HEIGHT_MM}mm).` };
  }

  // Validate that heights don't exceed A4 height
  if (settings.singlePageItemsMaxHeight_mm > settings.a4Height_mm || 
      settings.multiPageFirstMaxHeight_mm > settings.a4Height_mm ||
      settings.multiPageNonLastMaxHeight_mm > settings.a4Height_mm ||
      settings.multiPageLastMaxHeight_mm > settings.a4Height_mm) {
    return { valid: false, error: `Page height exceeds A4 height (${settings.a4Height_mm}mm).` };
  }

  return { valid: true };
};

const paginateItems = (items: RowMeasurement[], settings: PaginationSettings): PageDescriptor[] => {
  const { singlePageItemsMaxHeight_mm, multiPageFirstMaxHeight_mm, multiPageNonLastMaxHeight_mm, multiPageLastMaxHeight_mm } = settings;
  const totalItemsHeight = items.reduce((sum, row) => sum + row.height, 0);
  const isSinglePage = totalItemsHeight <= singlePageItemsMaxHeight_mm;

  console.log('[paginateItems - TechnicalFile] Settings:', { singlePageItemsMaxHeight_mm, multiPageFirstMaxHeight_mm, multiPageNonLastMaxHeight_mm, multiPageLastMaxHeight_mm });
  console.log('[paginateItems - TechnicalFile] Items:', {
    count: items.length,
    realItems: items.filter(r => !r.isEmptyRow).length,
    emptyItems: items.filter(r => r.isEmptyRow).length,
    totalHeight: totalItemsHeight.toFixed(2),
    isSinglePage
  });

  if (isSinglePage) {
    console.log('[paginateItems - TechnicalFile] Using single page mode');
    return [{
      pageNum: 1,
      pageType: 'single',
      itemsTableMaxHeight: Math.max(totalItemsHeight, singlePageItemsMaxHeight_mm), // Use actual height, not the constraint
      itemsTableHeightUsed: totalItemsHeight,
      rows: items.map((row, index) => ({ ...row, originalIndex: index })),
      realItemsCount: items.filter(row => !row.isEmptyRow).length,
      emptyRowsCount: items.filter(row => row.isEmptyRow).length,
    }];
  }

  console.log('[paginateItems - TechnicalFile] Using multi-page mode');

  if (items.length === 0) return [];

  const pages: PageDescriptor[] = [];
  let currentPageNum = 1;

  // Reserve the last item (whether empty or real) for the last page
  const reservedLastItem = items[items.length - 1];
  console.log('[paginateItems - TechnicalFile] Reserved last item for last page (isEmpty:', reservedLastItem.isEmptyRow, ')');

  // In multi-page mode, we have three page types:
  // - First page (multi-first): contains header and customer info
  // - Other pages (multi-non-last): no header, no footer
  // - Last page (multi-last): contains footer (QR code, signatures, terms)
  
  // Calculate total height of all items except the reserved one
  const itemsWithoutReserved = items.slice(0, -1);
  const totalHeightWithoutReserved = itemsWithoutReserved.reduce((sum, item) => sum + item.height, 0);

  // Case 1: Everything fits on last page (except reserved)
  // We still need at least 2 pages: first page + last page
  if (totalHeightWithoutReserved <= multiPageLastMaxHeight_mm) {
    // Create first page with some items from the beginning
    let firstPageItems: RowMeasurement[] = [];
    let firstPageHeight = 0;

    // Take as many items as possible for the first page (at least one if available)
    for (let i = 0; i < itemsWithoutReserved.length; i++) {
      const item = itemsWithoutReserved[i];
      if (firstPageHeight + item.height > multiPageFirstMaxHeight_mm) break;
      firstPageItems.push(item);
      firstPageHeight += item.height;
    }

    // Ensure at least one item on the first page if possible
    if (firstPageItems.length === 0 && itemsWithoutReserved.length > 0) {
      firstPageItems.push(itemsWithoutReserved[0]);
      firstPageHeight = itemsWithoutReserved[0].height;
    }

    // Create first page
    if (firstPageItems.length > 0) {
      pages.push({
        pageNum: currentPageNum,
        pageType: 'multi-first',
        itemsTableMaxHeight: multiPageFirstMaxHeight_mm,
        itemsTableHeightUsed: firstPageHeight,
        rows: firstPageItems,
        realItemsCount: firstPageItems.filter(row => !row.isEmptyRow).length,
        emptyRowsCount: firstPageItems.filter(row => row.isEmptyRow).length,
      });
      console.log(`[paginateItems - TechnicalFile] Created first page ${currentPageNum} with ${firstPageItems.length} items (real: ${firstPageItems.filter(r => !r.isEmptyRow).length}), height: ${firstPageHeight.toFixed(2)}mm`);
      currentPageNum++;

      // Remaining items (after first page) go to last page
      const remainingItems = itemsWithoutReserved.slice(firstPageItems.length);
      const lastPageItems = [...remainingItems, reservedLastItem];
      const lastPageHeight = lastPageItems.reduce((sum, row) => sum + row.height, 0);
      pages.push({
        pageNum: currentPageNum,
        pageType: 'multi-last',
        itemsTableMaxHeight: multiPageLastMaxHeight_mm,
        itemsTableHeightUsed: lastPageHeight,
        rows: lastPageItems,
        realItemsCount: lastPageItems.filter(row => !row.isEmptyRow).length,
        emptyRowsCount: lastPageItems.filter(row => row.isEmptyRow).length,
      });
      console.log(`[paginateItems - TechnicalFile] Created last page ${currentPageNum} with ${lastPageItems.length} items, height: ${lastPageHeight.toFixed(2)}mm`);
    } else {
      // No items for first page, just put everything on last page (edge case)
      const lastPageItems = [...itemsWithoutReserved, reservedLastItem];
      const lastPageHeight = lastPageItems.reduce((sum, row) => sum + row.height, 0);
      pages.push({
        pageNum: currentPageNum,
        pageType: 'multi-last',
        itemsTableMaxHeight: multiPageLastMaxHeight_mm,
        itemsTableHeightUsed: lastPageHeight,
        rows: lastPageItems,
        realItemsCount: lastPageItems.filter(row => !row.isEmptyRow).length,
        emptyRowsCount: lastPageItems.filter(row => row.isEmptyRow).length,
      });
      console.log(`[paginateItems - TechnicalFile] Created last page ${currentPageNum} with ${lastPageItems.length} items, height: ${lastPageHeight.toFixed(2)}mm`);
    }

    console.log('[paginateItems - TechnicalFile] Total pages created:', pages.length);
    return pages;
  }

  // Case 2: Items don't all fit on last page
  // We need: first page + (optional other pages) + last page
  
  // First, create the first page with items
  let currentHeight = 0;
  let itemsForThisPage: RowMeasurement[] = [];

  for (let i = 0; i < itemsWithoutReserved.length; i++) {
    const item = itemsWithoutReserved[i];

    // Check if adding this item would exceed max height for first page
    if (currentHeight + item.height > multiPageFirstMaxHeight_mm) {
      // Create the first page if it has items
      if (itemsForThisPage.length > 0) {
        const itemsForThisPageHeight = itemsForThisPage.reduce((sum, row) => sum + row.height, 0);
        pages.push({
          pageNum: currentPageNum,
          pageType: 'multi-first',
          itemsTableMaxHeight: multiPageFirstMaxHeight_mm,
          itemsTableHeightUsed: itemsForThisPageHeight,
          rows: itemsForThisPage.map(row => ({ ...row })),
          realItemsCount: itemsForThisPage.filter(row => !row.isEmptyRow).length,
          emptyRowsCount: itemsForThisPage.filter(row => row.isEmptyRow).length,
        });
        console.log(`[paginateItems - TechnicalFile] Created first page ${currentPageNum} with ${itemsForThisPage.length} items (real: ${itemsForThisPage.filter(r => !r.isEmptyRow).length}), height: ${itemsForThisPageHeight.toFixed(2)}mm`);
        currentPageNum++;
        itemsForThisPage = [];
        currentHeight = 0;
      }

      // Try adding this item to a new page (now treating as "other page")
      if (item.height > multiPageNonLastMaxHeight_mm) {
        // Item is too big, skip it (will go to last page)
        continue;
      }
    }

    // Add item to current page
    itemsForThisPage.push(item);
    currentHeight += item.height;
  }

  // If we have remaining items that haven't been added to a page yet, they go to "other pages" or "last page"
  if (itemsForThisPage.length > 0) {
    // Check if these items can fit on the last page with the reserved item
    const itemsForThisPageHeight = itemsForThisPage.reduce((sum, row) => sum + row.height, 0);
    const lastPageWithRemainingHeight = itemsForThisPageHeight + reservedLastItem.height;
    
    if (pages.length === 0) {
      // No first page was created yet, this shouldn't happen but handle it
      // Create a first page with at least one item
      const firstItem = itemsForThisPage[0];
      pages.push({
        pageNum: currentPageNum,
        pageType: 'multi-first',
        itemsTableMaxHeight: multiPageFirstMaxHeight_mm,
        itemsTableHeightUsed: firstItem.height,
        rows: [firstItem],
        realItemsCount: firstItem.isEmptyRow ? 0 : 1,
        emptyRowsCount: firstItem.isEmptyRow ? 1 : 0,
      });
      console.log(`[paginateItems - TechnicalFile] Created first page ${currentPageNum} with 1 item, height: ${firstItem.height.toFixed(2)}mm`);
      currentPageNum++;
      
      // Remaining items go to last page
      itemsForThisPage = itemsForThisPage.slice(1);
    } else if (lastPageWithRemainingHeight > multiPageLastMaxHeight_mm) {
      // They don't fit on last page, create "other pages"
      let currentOtherPageHeight = 0;
      let itemsForOtherPage: RowMeasurement[] = [];
      
      for (const item of itemsForThisPage) {
        if (currentOtherPageHeight + item.height > multiPageNonLastMaxHeight_mm) {
          // Create an "other page"
          const otherPageHeight = itemsForOtherPage.reduce((sum, row) => sum + row.height, 0);
          pages.push({
            pageNum: currentPageNum,
            pageType: 'multi-non-last',
            itemsTableMaxHeight: multiPageNonLastMaxHeight_mm,
            itemsTableHeightUsed: otherPageHeight,
            rows: itemsForOtherPage.map(row => ({ ...row })),
            realItemsCount: itemsForOtherPage.filter(row => !row.isEmptyRow).length,
            emptyRowsCount: itemsForOtherPage.filter(row => row.isEmptyRow).length,
          });
          console.log(`[paginateItems - TechnicalFile] Created other page ${currentPageNum} with ${itemsForOtherPage.length} items (real: ${itemsForOtherPage.filter(r => !r.isEmptyRow).length}), height: ${otherPageHeight.toFixed(2)}mm`);
          currentPageNum++;
          itemsForOtherPage = [];
          currentOtherPageHeight = 0;
        }
        
        itemsForOtherPage.push(item);
        currentOtherPageHeight += item.height;
      }
      
      // Remaining items go to last page
      itemsForThisPage = itemsForOtherPage;
    }
    // If they fit on last page, itemsForThisPage stays as is
  }

  // Create the last page with remaining items and the reserved item
  const lastPageItems = [...itemsForThisPage, reservedLastItem];
  const lastPageHeight = lastPageItems.reduce((sum, row) => sum + row.height, 0);
  pages.push({
    pageNum: currentPageNum,
    pageType: 'multi-last',
    itemsTableMaxHeight: multiPageLastMaxHeight_mm,
    itemsTableHeightUsed: lastPageHeight,
    rows: lastPageItems.map(row => ({ ...row })),
    realItemsCount: lastPageItems.filter(row => !row.isEmptyRow).length,
    emptyRowsCount: lastPageItems.filter(row => row.isEmptyRow).length,
  });
  console.log(`[paginateItems - TechnicalFile] Created last page ${currentPageNum} with ${lastPageItems.length} items, height: ${lastPageHeight.toFixed(2)}mm`);

  console.log('[paginateItems - TechnicalFile] Total pages created:', pages.length);
  return pages;
};

/**
 * Calculate the total height of the items table (real items + empty rows)
 * @param config - The PDF configuration
 * @param machineModels - The array of machine models (items)
 * @returns Total table height in mm
 */
export const calculateTableTotalHeight = (
  config: PDFConfiguration,
  machineModels: MachineModel[]
): number => {
  const allItems: RowMeasurement[] = [];
  const actualItems = machineModels.length;
  const emptyRows = config?.technicalFileEmptyRows ?? 8;

  console.log('[calculateTableTotalHeight - TechnicalFile] Input:', { actualItems, emptyRows });

  // Measure real items
  for (let i = 0; i < actualItems; i++) {
    const model = machineModels[i];
    const rowData: RowLayoutData = {
      text: `${model.name}`,
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 12,
      cellWidths: [50, 150, 150, 120, 80, 120, 120],
    };
    const measured = measureRowHeight(rowData, false);
    allItems.push(measured);
  }

  // Measure empty rows
  for (let i = 0; i < emptyRows; i++) {
    const emptyData: RowLayoutData = {
      text: "",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 12,
      cellWidths: [50, 150, 150, 120, 80, 120, 120],
    };
    const measured = measureRowHeight(emptyData, true);
    allItems.push(measured);
  }

  // Calculate total height
  const totalHeight = allItems.reduce((sum, row) => sum + row.height, 0);
  console.log('[calculateTableTotalHeight - TechnicalFile] Result:', { totalHeight: totalHeight.toFixed(2), allItems });
  return totalHeight;
};

// --- QR Code Logic ---

export const getQrCodeDataUrls = async (
  config: PDFConfiguration,
  company: Company,
  customers: Customer[],
  machineModels: MachineModel[],
  testVerificationToken: string,
  qrCodeSettings: QRCodeConfig,
  orderId?: string,
  activityProfile?: CompanyProfile
): Promise<{ qrUrl: string, placeholderQrUrl: string } | null> => {
  if (!config || !company || !customers.length || !machineModels.length) return null;

  try {
    // Use activity profile data if available, otherwise fall back to company data
    const companyInfo: CompanyInfo = {
      name: company.name,
      phoneNumbers: company.phoneNumbers || [],
      faxNumbers: company.faxNumbers || [],
      emails: company.emails || [],
      nif: activityProfile?.nif ?? company.nif,
      nis: activityProfile?.nis ?? company.nis,
      rcn: activityProfile?.rcn ?? company.rcn,
      rib: activityProfile?.rib ?? company.rib,
      bankName: activityProfile?.bankName ?? company.bankName,
      address: company.address,
    };

    const customer = customers[0];
    const customerInfo: CustomerInfo = {
      name: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      nif: customer.nif,
      nis: customer.nis,
      rcn: customer.rcn,
    };

    const firstModel = machineModels[0];
    
    // Technical files don't have formatted numbers like "PRO-XXX/YYYY"
    // Use simple order identifier like "TF-{orderId}"
    const fileIdentifier = orderId ? `TF-${orderId}` : `TF-${Date.now()}`;
    
    const fileInfo: FileInfo = {
      type: "TechnicalFile",
      number: fileIdentifier,
      date: new Date().toISOString().split('T')[0],
      location: company.city || "",
      totalAmount: firstModel?.basePrice || 0,
      currency: company.currency || "DZD",
    };

    const itemsData: ItemData[] = machineModels.slice(0, 3).map((model) => ({
      name: model.name || "Item",
      quantity: 1,
      unitPrice: model.basePrice || 0,
      totalPrice: model.basePrice || 0,
    }));

    const qrCodeData: QRCodeData = {
      company: companyInfo,
      customer: customerInfo,
      file: fileInfo,
      items: itemsData,
      terms: "Technical file terms",
      verificationToken: testVerificationToken || "",
    };

    const qrUrl = await generateQRCodeDataURL(qrCodeData, qrCodeSettings);
    const placeholderQrUrl = await generateQRCodeDataURL(qrCodeData, {
      ...qrCodeSettings,
      size: config.qrCodeSize || 50,
      errorCorrectionLevel: qrCodeSettings.errorCorrectionLevel,
    });

    return { qrUrl, placeholderQrUrl };
  } catch (error) {
    console.error('Error generating QR code preview:', error);
    return null;
  }
};

// --- HTML Generation ---

interface GeneratePreviewParams {
  config: PDFConfiguration;
  company: Company;
  customers: Customer[];
  machineModels: MachineModel[];
  selectedLanguage: string;
  selectedCurrency: string;
  exchangeRates: ExchangeRate[];
  logoBase64: string;
  qrCodeImageUrl: string;
  technicalFileTranslations: any;
  labelsFr: any;
  labelsAr: any;
  activityProfile?: CompanyProfile;
}

export const generatePreviewHTML = ({
  config,
  company,
  customers,
  machineModels,
  selectedLanguage,
  selectedCurrency,
  exchangeRates,
  logoBase64,
  qrCodeImageUrl,
  technicalFileTranslations,
  labelsFr,
  labelsAr,
  activityProfile
}: GeneratePreviewParams): string => {
  if (!config || !company) return "";

  const settings = getPaginationSettings(config);
  const allItems: RowMeasurement[] = [];
  const actualItems = machineModels.length;
  const emptyRows = config?.technicalFileEmptyRows ?? 8;

  // Add real items
  for (let i = 0; i < actualItems; i++) {
    const model = machineModels[i];
    const rowData: RowLayoutData = {
      text: `${model.name}`,
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 12,
      cellWidths: [50, 150, 150, 120, 80, 120, 120],
    };
    const measured = measureRowHeight(rowData, false);
    measured.originalIndex = i;
    allItems.push(measured);
  }

  // Add empty rows
  for (let i = 0; i < emptyRows; i++) {
    const emptyData: RowLayoutData = {
      text: "",
      fontFamily: "Helvetica, Arial, sans-serif",
      fontSize: 12,
      cellWidths: [50, 150, 150, 120, 80, 120, 120],
    };
    const measured = measureRowHeight(emptyData, true);
    measured.originalIndex = actualItems + i;
    allItems.push(measured);
  }

  const validation = validatePaginationSettings(settings, allItems);
  if (!validation.valid) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; padding: 20px; background: #fff3f3; }
  .error-container { max-width: 800px; margin: 50px auto; padding: 30px; background: white; border: 2px solid #dc2626; border-radius: 8px; }
  .error-title { color: #dc2626; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
  .error-message { color: #333; font-size: 16px; line-height: 1.6; }
</style>
</head>
<body>
<div class="error-container">
  <div class="error-title">⚠️ Pagination Settings Error</div>
  <div class="error-message">${validation.error}</div>
</div>
</body>
</html>`;
  }

  const pages = paginateItems(allItems, settings);
  const totalPages = pages.length;

  const fontFamilyMap: Record<string, string> = {
    HELVETICA: "Helvetica, Arial, sans-serif",
    TIMES_ROMAN: "Times New Roman, serif",
    COURIER: "Courier, monospace",
    ARIAL: "Arial, sans-serif",
  };

  const activeLogo = company.logos?.find(logo => logo.isActive || logo.id === company.activeLogoId);
  // Use logoBase64 if available, otherwise url, otherwise null
  const logoUrl = logoBase64 || activeLogo?.url || null; 
  const logoMaxWidth = Math.round(150 * config.logoScaling);
  const logoMaxHeight = Math.round(100 * config.logoScaling);

  // Get activity profile data for header (falls back to company data if no profile selected)
  const profileNif = activityProfile?.nif ?? company.nif;
  const profileNis = activityProfile?.nis ?? company.nis;
  const profileRcn = activityProfile?.rcn ?? company.rcn;
  const profileRib = activityProfile?.rib ?? company.rib;
  const profileBankName = activityProfile?.bankName ?? company.bankName;
  const profileFundCapital = activityProfile?.fundCapital ?? company.fundCapital;

  // Respect the global PDF header settings for activity descriptions
  const activityDescriptionAr = config.includeArabicDescription === true ? (company.activityDescriptionAr || "") : "";
  // Show French description if includeFrenchDescription is true
  const activityDescriptionFrOrEn = config.includeFrenchDescription === true ? (company.activityDescriptionFr || "") : "";

  const tInv = technicalFileTranslations[selectedLanguage as keyof typeof technicalFileTranslations];

  const companyNameFontFamily = fontFamilyMap[config.companyNameFontFamily] || "Arial, sans-serif";
  const descriptionFontFamily = fontFamilyMap[config.descriptionFontFamily] || "Arial, sans-serif";
  const labelFontFamily = fontFamilyMap[config.labelFontFamily] || "Arial, sans-serif";
  const dataFontFamily = fontFamilyMap[config.dataFontFamily] || "Arial, sans-serif";
  const titleFontFamily = fontFamilyMap[config.technicalFileTitleFontFamily || "HELVETICA"];
  const clientLabelFontFamily = fontFamilyMap[config.technicalFileClientLabelFontFamily || "HELVETICA"];
  const clientValueFontFamily = fontFamilyMap[config.technicalFileClientValueFontFamily || "HELVETICA"];
  const dateFontFamily = fontFamilyMap[config.technicalFileDateFontFamily || "HELVETICA"];
  const tableLabelFontFamily = fontFamilyMap[config.technicalFileTableLabelFontFamily || "HELVETICA"];
  const tableValueFontFamily = fontFamilyMap[config.technicalFileTableValueFontFamily || "HELVETICA"];
  const termsFontFamily = fontFamilyMap[config.technicalFileTermsFontFamily || "HELVETICA"];
  const pageNumberFontFamily = fontFamilyMap[config.technicalFilePageNumberFontFamily || "HELVETICA"];

  const lastCustomer = customers[0];
  const todayDate = getTodayDate();

  const baseCurrency = machineModels.length > 0 ? machineModels[0]?.currency : company.currency || "DZD";
  const totalHT = machineModels.reduce((sum, model) => {
    const basePrice = model.basePrice || 0;
    const modelCurrency = model.currency || baseCurrency;
    const convertedPrice = convertPrice(basePrice, modelCurrency, selectedCurrency, exchangeRates) || basePrice;
    return sum + convertedPrice;
  }, 0);
  
  const tvaRate = 0.19;
  const tvaAmount = totalHT * tvaRate;
  const totalTTC = totalHT + tvaAmount;

  const generateHeaderHTML = () => `
  <div class="top-section">
    <div class="company-name">${company.name || "COMPANY NAME"}</div>
    ${activityDescriptionAr ? `<div class="activity-ar">${activityDescriptionAr}</div>` : ""}
    ${activityDescriptionFrOrEn ? `<div class="activity-fr-en">${activityDescriptionFrOrEn}</div>` : ""}
  </div>

  <div class="middle-section">
    <div class="left-column">
      ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsFr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
      ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsFr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
      ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsFr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
      ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsFr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
      ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsFr.rcn}:</span> <span class="field-data">${profileRcn || ""}</span></div>` : ""}
      ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsFr.nif}:</span> <span class="field-data">${profileNif || ""}</span></div>` : ""}
      ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsFr.nis}:</span> <span class="field-data">${profileNis || ""}</span></div>` : ""}
      ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsFr.rib}:</span> <span class="field-data">${profileRib || ""}</span></div>` : ""}
      ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsFr.bankName}:</span> <span class="field-data">${profileBankName || ""}</span></div>` : ""}
      ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsFr.capitalSocial}:</span> <span class="field-data">${profileFundCapital ? String(profileFundCapital) : ""}</span></div>` : ""}
    </div>

    <div class="center-column">
      ${logoUrl ? `<img src="${logoUrl}" style="max-width: ${logoMaxWidth}px; max-height: ${logoMaxHeight}px; transform: translate(${config.logoOffsetX}px, ${config.logoOffsetY}px);" alt="Logo" />` : `<div class="logo-placeholder">Logo</div>`}
    </div>

    <div class="right-column">
      ${config.includeTelephone ? `<div class="field-label"><span class="field-label">${labelsAr.telephone}:</span> <span class="field-data">${company.phoneNumbers?.join(", ") || ""}</span></div>` : ""}
      ${config.includeFax ? `<div class="field-label"><span class="field-label">${labelsAr.fax}:</span> <span class="field-data">${company.faxNumbers?.join(", ") || ""}</span></div>` : ""}
      ${config.includeAddress ? `<div class="field-label"><span class="field-label">${labelsAr.address}:</span> <span class="field-data">${company.address || ""}</span></div>` : ""}
      ${config.includeEmail ? `<div class="field-label"><span class="field-label">${labelsAr.email}:</span> <span class="field-data">${company.emails?.join(", ") || ""}</span></div>` : ""}
      ${config.includeRcn ? `<div class="field-label"><span class="field-label">${labelsAr.rcn}:</span> <span class="field-data">${profileRcn || ""}</span></div>` : ""}
      ${config.includeNif ? `<div class="field-label"><span class="field-label">${labelsAr.nif}:</span> <span class="field-data">${profileNif || ""}</span></div>` : ""}
      ${config.includeNis ? `<div class="field-label"><span class="field-label">${labelsAr.nis}:</span> <span class="field-data">${profileNis || ""}</span></div>` : ""}
      ${config.includeRib ? `<div class="field-label"><span class="field-label">${labelsAr.rib}:</span> <span class="field-data">${profileRib || ""}</span></div>` : ""}
      ${config.includeBankName ? `<div class="field-label"><span class="field-label">${labelsAr.bankName}:</span> <span class="field-data">${profileBankName || ""}</span></div>` : ""}
      ${config.includeCapitalSocial ? `<div class="field-label"><span class="field-label">${labelsAr.capitalSocial}:</span> <span class="field-data">${profileFundCapital ? String(profileFundCapital) : ""}</span></div>` : ""}
    </div>
  </div>

  <div class="technicalfile-top-body">
    <div class="technicalfile-title" dir="${selectedLanguage === 'AR' ? 'rtl' : 'ltr'}">${tInv.technicalFileTitle || "Technical File"}</div>
    <div class="customer-section">
      <div class="customer-left-column">
        <div class="customer-field"><span class="customer-label">${tInv.client}:</span> <span class="customer-value">${lastCustomer ? lastCustomer.fullName : tInv.noClient}</span></div>
        ${lastCustomer?.address ? `<div class="customer-field"><span class="customer-label">${tInv.address}:</span> <span class="customer-value">${lastCustomer.address}</span></div>` : ""}
        ${lastCustomer?.phone ? `<div class="customer-field"><span class="customer-label">${tInv.phone}:</span> <span class="customer-value">${lastCustomer.phone}</span></div>` : ""}
        ${lastCustomer?.email ? `<div class="customer-field"><span class="customer-label">${tInv.email}:</span> <span class="customer-value">${lastCustomer.email}</span></div>` : ""}
      </div>
      <div class="customer-right-column">
        ${lastCustomer?.rcn ? `<div class="customer-field"><span class="customer-label">RCN:</span> <span class="customer-value">${lastCustomer.rcn}</span></div>` : ""}
        ${lastCustomer?.nif ? `<div class="customer-field"><span class="customer-label">NIF:</span> <span class="customer-value">${lastCustomer.nif}</span></div>` : ""}
        ${lastCustomer?.nis ? `<div class="customer-field"><span class="customer-label">NIS:</span> <span class="customer-value">${lastCustomer.nis}</span></div>` : ""}
        ${lastCustomer?.rib ? `<div class="customer-field"><span class="customer-label">RIB:</span> <span class="customer-value">${lastCustomer.rib}</span></div>` : ""}
      </div>
    </div>
    <div class="date-section">
      ${config.technicalFileLocationDateLabelText || tInv.datePrefix} ${todayDate}
    </div>
  </div>
  `;

  const generateItemsTableHTML = (pageDescriptor: PageDescriptor) => {
    const { itemsTableMaxHeight: maxTableHeight, pageNum, rows, pageType } = pageDescriptor;
    const pageItems = rows.map(row => {
      if (row.isEmptyRow) return { type: 'empty' };
      const model = machineModels[row.originalIndex];
      return model ? { type: 'model', index: row.originalIndex, model } : { type: 'empty' };
    });

    // Note: We don't apply max-height constraint anymore because:
    // 1. Pagination logic already ensures correct items on each page
    // 2. Browser rendering heights may differ from canvas measurement
    // 3. overflow: hidden was cutting off rows in preview
    // The height constraint is only used for pagination decisions, not for display
    const maxHeightStyle = '';

    return `
  <div class="items-table-wrapper" style="${maxHeightStyle}">
    <table class="items-table">
    <thead>
      <tr>
        <th style="width: ${config.technicalFileColNumberWidth ?? 13.23}mm; padding: ${(config.technicalFileColNumberPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.number}</th>
        <th style="width: ${config.technicalFileColFamilyWidth ?? 39.69}mm; padding: ${(config.technicalFileColFamilyPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.family}</th>
        <th style="width: ${config.technicalFileColModelWidth ?? 39.69}mm; padding: ${(config.technicalFileColModelPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.model}</th>
        <th style="width: ${config.technicalFileColBrandWidth ?? 31.75}mm; padding: ${(config.technicalFileColBrandPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.brand}</th>
        <th style="width: ${config.technicalFileColQuantityWidth ?? 21.17}mm; padding: ${(config.technicalFileColQuantityPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.quantity}</th>
        <th style="width: ${config.technicalFileColPriceUnitWidth ?? 31.75}mm; padding: ${(config.technicalFileColPriceUnitPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.priceUnit}</th>
        <th style="width: ${config.technicalFileColPriceTotalWidth ?? 31.75}mm; padding: ${(config.technicalFileColPriceTotalPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${tInv.tableHeaders.priceTotal}</th>
      </tr>
    </thead>
    <tbody>
      ${pageItems.map((item: any) => {
        if (item.type === 'model') {
          const model = item.model;
          const index = item.index;
          const brand = model.isManufactured ? company.name : "";
          const quantity = 1;
          const basePrice = model.basePrice || 0;
          const modelCurrency = model.currency || baseCurrency;
          const pricePerUnit = convertPrice(basePrice, modelCurrency, selectedCurrency, exchangeRates) || basePrice;
          const priceExclTax = pricePerUnit * quantity;

          return `
      <tr>
        <td style="padding: ${(config.technicalFileColNumberPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${index + 1}</td>
        <td style="padding: ${(config.technicalFileColFamilyPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${model.family?.name || ""}</td>
        <td style="padding: ${(config.technicalFileColModelPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${model.name}</td>
        <td style="padding: ${(config.technicalFileColBrandPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${brand}</td>
        <td style="padding: ${(config.technicalFileColQuantityPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${quantity}</td>
        <td style="padding: ${(config.technicalFileColPriceUnitPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${formatPrice(pricePerUnit, selectedCurrency)} ${selectedCurrency}</td>
        <td style="padding: ${(config.technicalFileColPriceTotalPadding ?? 5.61) / 2}mm; text-align: center; vertical-align: middle;">${formatPrice(priceExclTax, selectedCurrency)} ${selectedCurrency}</td>
      </tr>`;
        } else {
          return `
      <tr>
        <td style="border: 1px solid #000; padding: ${(config.technicalFileColNumberPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColFamilyPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColModelPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColBrandPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColQuantityPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColPriceUnitPadding ?? 5.61) / 2}mm;">&nbsp;</td>
        <td style="padding: ${(config.technicalFileColPriceTotalPadding ?? 5.61) / 2}mm;">&nbsp;</td>
      </tr>`;
        }
      }).join('')}
    </tbody>
  </table>
  </div>`;
  };

  const generateTotalsHTML = () => `
  <div class="totals-section">
    <table class="totals-table">
      <tr><td class="totals-label">${tInv.totals.totalHT}</td><td class="totals-value">${formatPrice(totalHT, selectedCurrency)} ${selectedCurrency}</td></tr>
      <tr><td class="totals-label">${tInv.totals.tva}</td><td class="totals-value">${formatPrice(tvaAmount, selectedCurrency)} ${selectedCurrency}</td></tr>
      <tr class="total-row"><td class="totals-label">${tInv.totals.totalTTC}</td><td class="totals-value">${formatPrice(totalTTC, selectedCurrency)} ${selectedCurrency}</td></tr>
    </table>
  </div>`;

  const generateFooterHTML = () => {
    const signaturePosition = config.technicalFileSignaturePosition || "right";
    const signatureCount = config.technicalFileSignatureCount || 2;
    const signatureLineWidth = config.technicalFileSignatureLineWidth || 150;
    let signatureHTML = '';

    if (signatureCount === 1) {
      if (config.technicalFileIncludeLeftSignature !== false) {
        const justifyContentStyle = signaturePosition === 'left' ? 'justify-content: flex-start;' :
                                    signaturePosition === 'middle' ? 'justify-content: center;' :
                                    'justify-content: flex-end;';
        signatureHTML = `
      <div class="signature-line" style="${justifyContentStyle}" dir="ltr">
        <div class="signature-box" style="width: auto; text-align: center;">
          <div class="signature-line-visual" style="width: ${signatureLineWidth}px;"></div>
          <div class="signature-label" style="text-align: center;">${config.technicalFileSignatureLeftLabelText || tInv.signature.manager}</div>
        </div>
      </div>`;
      }
    } else {
      if (config.technicalFileIncludeLeftSignature !== false || config.technicalFileIncludeRightSignature !== false) {
        signatureHTML = '<div class="signature-line" dir="ltr">';
        if (config.technicalFileIncludeLeftSignature !== false) {
          signatureHTML += `
        <div class="signature-box" style="position: relative; left: ${config.technicalFileLeftSignatureOffsetX || 0}px; top: ${config.technicalFileLeftSignatureOffsetY || 0}px;">
          <div class="signature-line-visual" style="width: ${signatureLineWidth}px;"></div>
          <div class="signature-label" style="text-align: center;">${config.technicalFileSignatureLeftLabelText || tInv.signature.manager}</div>
        </div>`;
        }
        if (config.technicalFileIncludeRightSignature !== false) {
          signatureHTML += `
        <div class="signature-box" style="position: relative; left: ${config.technicalFileRightSignatureOffsetX || 0}px; top: ${config.technicalFileRightSignatureOffsetY || 0}px;">
          <div class="signature-line-visual" style="width: ${signatureLineWidth}px;"></div>
          <div class="signature-label" style="text-align: center;">${config.technicalFileSignatureRightLabelText || tInv.signature.client}</div>
        </div>`;
        }
        signatureHTML += '</div>';
      }
    }

    const termsList = [];
    const langCode = selectedLanguage.toLowerCase() as 'en' | 'fr' | 'ar';

    if (config.technicalFileTermsIncludeDelivery !== false) {
      const timeText = formatTimePeriod(config.technicalFileTermsDeliveryTimeFrom || 3, config.technicalFileTermsDeliveryTimeTo || null, config.technicalFileTermsDeliveryTimeUnit || 'months', langCode);
      termsList.push(`${tInv.terms.deliveryAfterOrder}: ${timeText} ${tInv.terms.afterOrderConfirmation.toLowerCase()}`);
    }
    if (config.technicalFileTermsIncludeValidity !== false) {
      const timeText = formatTimePeriod(config.technicalFileTermsValidityTime || 3, config.technicalFileTermsValidityTimeTo || null, config.technicalFileTermsValidityTimeUnit || 'months', langCode);
      termsList.push(`${tInv.terms.validityTitle}: ${timeText}`);
    }
    if (config.technicalFileTermsIncludeWarranty !== false) {
      const timeText = formatTimePeriod(config.technicalFileTermsWarrantyTime || 12, config.technicalFileTermsWarrantyTimeTo || null, config.technicalFileTermsWarrantyTimeUnit || 'months', langCode);
      termsList.push(`${tInv.terms.warrantyTitle}: ${timeText}`);
    }
    if (config.technicalFileTermsIncludeConfirmation !== false) {
      termsList.push(config.technicalFileTermsDeliveryCondition === 'after_payment' ? tInv.terms.afterPayment : tInv.terms.afterOrderConfirmation);
    }
    if (config.technicalFileTermsIncludePayment !== false) {
      const paymentMethod = config.technicalFileTermsPaymentMethod || 'split_payment';
      const methodText = tInv.terms.paymentMethod[paymentMethod] || tInv.terms.paymentMethod.splitPayment;
      if (paymentMethod === 'split_payment') {
        const percent = config.technicalFileTermsSplitPaymentPercent || 50;
        termsList.push(`${tInv.terms.paymentMethod.splitPayment}: ${tInv.terms.splitPaymentText.replace('{percent}', String(percent))}`);
      } else {
        termsList.push(`${tInv.terms.paymentMethod[paymentMethod] || methodText}`);
      }
    }
    if (config.technicalFileTermsIncludePriceInWords !== false) {
      termsList.push(`${tInv.terms.priceInWords}: ${currencyToWords(totalTTC, selectedCurrency, langCode)}`);
    }

    return `
  <div class="footer-section" dir="${selectedLanguage === 'AR' ? 'rtl' : 'ltr'}">
    <div class="terms-section">
      <div class="terms-title">${config.technicalFileTermsTitle || tInv.terms.title}</div>
      <ul class="terms-list">${termsList.map(term => `<li>${term}</li>`).join('')}</ul>
    </div>
    ${signatureHTML}
  </div>`;
  };

  const generatePageNumberHTML = (pageNum: number) => `<div class="page-number">${pageNum} / ${totalPages}</div>`;

  const generateQrCodeHTML = () => {
    if (!config.includeQrCode) return '';
    const qrCodeSize = config.qrCodeSize || 50;
    const offsetStyle = `right: ${10 + (config.qrCodeOffsetX || 0)}px; bottom: ${15 + (config.qrCodeOffsetY || 0)}px;`;
    
    if (qrCodeImageUrl) {
      return `
      <div class="qr-code-placeholder" style="width: ${qrCodeSize}px; height: ${qrCodeSize}px; position: absolute; ${offsetStyle}">
        <img src="${qrCodeImageUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>`;
    }
    return `
    <div class="qr-code-placeholder" style="width: ${qrCodeSize}px; height: ${qrCodeSize}px; ${offsetStyle}">
      <div style="width: 100%; height: 100%; border: 2px dashed #999; display: flex; align-items: center; justify-content: center; font-size: ${qrCodeSize * 0.3}px; color: #999; background: repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 10px, #fafafa 10px, #fafafa 20px);">QR</div>
    </div>`;
  };

  let pagesHTML = '';
  console.log('[generatePreviewHTML - TechnicalFile] Total pages to generate:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const isLastPage = page.pageType === 'multi-last' || page.pageType === 'single';
    console.log(`[generatePreviewHTML - TechnicalFile] Page ${page.pageNum}:`, {
      pageType: page.pageType,
      itemsCount: page.rows.length,
      tableHeight: page.itemsTableHeightUsed.toFixed(2),
      tableMaxHeight: page.itemsTableMaxHeight,
      realItems: page.realItemsCount,
      emptyRows: page.emptyRowsCount,
      isLastPage
    });
    pagesHTML += `
<div class="page" data-page="${page.pageNum}">
  <div class="page-content">
    ${page.pageNum === 1 ? generateHeaderHTML() : ''}
    ${generateItemsTableHTML(page)}
    ${isLastPage ? generateTotalsHTML() : ''}
  </div>
  ${isLastPage ? generateFooterHTML() : ''}
  ${isLastPage ? generateQrCodeHTML() : ''}
  ${generatePageNumberHTML(page.pageNum)}
</div>`;
  }

  // NOTE: CSS styles are massive, keeping them condensed but identical structure to original
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    @page { size: A4; margin: 0; width: 210mm; height: 297mm; }
    @media print { body { margin: 0; padding: 0; } .page { margin: 0; padding: 0; page-break-after: always; } }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #f5f5f5; display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px 0; }
    .page { width: 210mm; height: 297mm; margin: 0 auto; background: white; position: relative; padding: ${config.pageBorderMargin || 10}px; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    @media print { body { background: white; padding: 0; margin: 0; } .page { margin: 0 !important; box-shadow: none !important; height: auto !important; min-height: 297mm !important; max-height: 297mm !important; page-break-after: always !important; page-break-inside: avoid; orphans: 0; widows: 0; } .page-content { flex: 0 0 auto; } }
    .page-content { flex: 1; display: flex; flex-direction: column; }
    .top-section { text-align: center; margin-bottom: ${config.headerSectionMargin ? config.headerSectionMargin / 3.78 : 0}mm; }
    .company-name { font-family: ${companyNameFontFamily}; font-size: ${config.companyNameFontSize}px; color: ${config.companyNameTextColor}; font-weight: bold; text-transform: uppercase; margin-bottom: 2.65mm; line-height: ${config.companyNameLineSpacing || 0.5}; }
    .activity-ar { font-family: ${descriptionFontFamily}; font-size: ${config.descriptionFontSize}px; color: ${config.descriptionTextColor}; direction: rtl; text-align: center; margin-bottom: ${config.headerSectionMargin ? config.headerSectionMargin / 3.78 : 0}mm; line-height: ${config.descriptionLineSpacing || 0.5}; }
    .activity-fr-en { font-family: ${descriptionFontFamily}; font-size: ${config.descriptionFontSize}px; color: ${config.descriptionTextColor}; direction: ltr; text-align: center; margin-bottom: ${config.headerSectionMargin ? config.headerSectionMargin / 3.78 : 0}mm; line-height: ${config.descriptionLineSpacing || 0.5}; }
    .middle-section { display: flex; justify-content: space-between; align-items: flex-start; gap: 5.29mm; margin-bottom: 7.94mm; }
    .left-column { flex: 1; text-align: left; direction: ${config.leftPartDirection.toLowerCase()}; }
    .right-column { flex: 1; text-align: ${config.rightPartDirection === 'RTL' ? 'right' : 'left'}; direction: ${config.rightPartDirection.toLowerCase()}; }
    .center-column { flex: 1; display: flex; justify-content: center; align-items: center; position: relative; }
    .logo-placeholder { width: ${logoMaxWidth}px; height: ${logoMaxHeight}px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; background: #f5f5f5; transform: translate(${config.logoOffsetX}px, ${config.logoOffsetY}px); }
    .field-label { margin-bottom: ${8 * config.labelLineSpacing}px; font-family: ${labelFontFamily}; font-size: ${config.labelFontSize}px; color: ${config.labelTextColor}; }
    .field-data { font-family: ${dataFontFamily}; font-size: ${config.dataFontSize}px; color: ${config.dataTextColor}; }
    .technicalfile-top-body { margin-bottom: ${config.factureNumberMargin ? config.factureNumberMargin / 3.78 : 0}mm; direction: ${config.technicalFileTopBodyDirection === 'RTL' ? 'rtl' : 'ltr'}; }
    .technicalfile-title { font-family: ${titleFontFamily}; font-size: ${config.technicalFileTitleFontSize || 16}px; color: ${config.technicalFileTitleTextColor || "#000000"}; font-weight: ${config.technicalFileTitleBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileTitleUnderline ? 'underline' : 'none'}; margin-bottom: ${10 * (config.technicalFileTitleLineSpacing || 0.5) / 3.78}mm; line-height: ${config.technicalFileTitleLineSpacing || 0.5}; text-align: ${config.technicalFileTitlePosition || 'center'}; letter-spacing: ${config.technicalFileTitleLetterSpacing || 0}px; }
    .customer-section { display: flex; gap: 8mm; padding: 3mm; border-bottom: 1px solid #e0e0e0; text-align: ${config.technicalFileClientInfoPosition || 'left'}; background: #f9f9f9; }
    .customer-left-column { flex: 1; min-width: 60mm; display: flex; flex-direction: column; gap: 2mm; }
    .customer-right-column { flex: 1; display: flex; flex-direction: column; gap: 2mm; }
    .customer-label { font-family: ${clientLabelFontFamily}; font-size: ${config.technicalFileClientLabelFontSize || 12}px; color: ${config.technicalFileClientLabelTextColor || "#000000"}; font-weight: ${config.technicalFileClientLabelBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileClientLabelUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileClientLabelLineSpacing || 1}; letter-spacing: ${config.technicalFileClientLabelLetterSpacing || 0}px; }
    .customer-value { font-family: ${clientValueFontFamily}; font-size: ${config.technicalFileClientValueFontSize || 12}px; color: ${config.technicalFileClientValueTextColor || "#000000"}; font-weight: ${config.technicalFileClientValueBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileClientValueUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileClientValueLineSpacing || 1}; letter-spacing: ${config.technicalFileClientValueLetterSpacing || 0}px; }
    .customer-field { display: flex; gap: 4mm; }
    .date-section { margin-bottom: ${config.dateMargin ? config.dateMargin / 3.78 : 1.32}mm; font-family: ${dateFontFamily}; font-size: ${config.technicalFileDateFontSize || 12}px; color: ${config.technicalFileDateTextColor || "#000000"}; font-weight: ${config.technicalFileDateBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileDateUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileDateLineSpacing || 1}; letter-spacing: ${config.technicalFileDateLetterSpacing || 0}px; text-align: ${config.technicalFileDatePosition || 'left'}; }
    .items-table-wrapper { margin-bottom: ${config.itemTableMargin ? config.itemTableMargin / 3.78 : 1.32}mm; page-break-inside: avoid; }
    .items-table { width: 100%; border-collapse: collapse; overflow: hidden; }
    .items-table th, .items-table td { border: 1px solid #000; text-align: ${config.technicalFileTableTextAlignment || 'left'}; direction: ${config.technicalFileTableDirection === 'RTL' ? 'rtl' : 'ltr'}; }
    .items-table th { font-family: ${tableLabelFontFamily}; font-size: ${config.technicalFileTableLabelFontSize || 11}px; color: ${config.technicalFileTableLabelTextColor || "#000000"}; font-weight: ${config.technicalFileTableLabelBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileTableLabelUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileTableLabelLineSpacing || 1}; letter-spacing: ${config.technicalFileTableLabelLetterSpacing || 0}px; background: #f0f0f0; }
    .items-table td { font-family: ${tableValueFontFamily}; font-size: ${config.technicalFileTableValueFontSize || 11}px; color: ${config.technicalFileTableValueTextColor || "#000000"}; font-weight: ${config.technicalFileTableValueBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileTableValueUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileTableValueLineSpacing || 1}; letter-spacing: ${config.technicalFileTableValueLetterSpacing || 0}px; vertical-align: top; }
    .totals-section { display: flex; justify-content: flex-end; margin-top: ${config.summaryTableMargin ? config.summaryTableMargin / 3.78 : 5.29}mm; page-break-inside: avoid; }
    .totals-table { width: 79.37mm; border-collapse: collapse; }
    .totals-table td { padding: 2.12mm; border: 1px solid #000; font-family: ${tableValueFontFamily}; font-size: ${config.technicalFileTableValueFontSize || 11}px; color: ${config.technicalFileTableValueTextColor || "#000000"}; font-weight: ${config.technicalFileTableValueBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileTableValueUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileTableValueLineSpacing || 1}; letter-spacing: ${config.technicalFileTableValueLetterSpacing || 0}px; }
    .totals-label { font-weight: bold; background: #f9f9f9; }
    .totals-value { text-align: right; }
    .total-row td { font-weight: bold; background: #f0f0f0; }
    .footer-section { position: relative; margin-top: auto; padding-top: 3.97mm; padding-bottom: ${config.signatureSectionMargin ? config.signatureSectionMargin / 3.78 : 2.65}mm; border-top: 1px solid #000; page-break-inside: avoid; }
    .terms-section { margin-bottom: ${config.termsSectionMargin ? config.termsSectionMargin / 3.78 : 1.32}mm; font-family: ${termsFontFamily}; font-size: ${config.technicalFileTermsFontSize || 11}px; color: ${config.technicalFileTermsTextColor || "#000000"}; font-weight: ${config.technicalFileTermsBold ? 'bold' : 'normal'}; text-decoration: ${config.technicalFileTermsUnderline ? 'underline' : 'none'}; line-height: ${config.technicalFileTermsLineSpacing || 1}; letter-spacing: ${config.technicalFileTermsLetterSpacing || 0}px; text-align: ${config.technicalFileTermsPosition || 'left'}; }
    .terms-title { font-weight: bold; margin-bottom: 2.65mm; }
    .terms-list { list-style: none; padding: 0; }
    .terms-list li { margin-bottom: 2.12mm; padding-left: 5.29mm; position: relative; }
    .terms-list li::before { content: "${config.rightPartDirection === 'RTL' ? '←' : '→'}"; position: absolute; left: 0; }
    .signature-line { display: flex; justify-content: space-between; margin-top: 5.29mm; padding: 0 7.94mm 0 7.94mm; margin-bottom: ${config.pageNumberMargin ? config.pageNumberMargin / 3.78 : 1.32}mm; }
    .signature-box { width: 45%; text-align: center; }
    .signature-line-visual { border-bottom: 1px solid #000; margin: 0 auto 2.65mm auto; height: 10.58mm; }
    .signature-label { font-weight: bold; text-align: center !important; width: 100%; display: block; }
    .page-number { position: absolute; bottom: ${5 + (config.technicalFilePageNumberOffsetY || 0)}mm; ${config.technicalFilePageNumberPosition === 'left' ? 'left: 10mm;' : ''} ${config.technicalFilePageNumberPosition === 'right' ? 'right: 10mm;' : ''} ${config.technicalFilePageNumberPosition === 'center' || !config.technicalFilePageNumberPosition ? 'left: 50%; transform: translateX(-50%);' : ''} ${config.technicalFilePageNumberPosition !== 'center' && config.technicalFilePageNumberPosition ? `transform: translateX(${config.technicalFilePageNumberOffsetX || 0}px);` : ''} font-family: ${pageNumberFontFamily}; font-size: ${config.technicalFilePageNumberFontSize || 10}px; color: ${config.technicalFilePageNumberTextColor || "#666"}; text-align: center; }
    .qr-code-placeholder { position: absolute; z-index: 10; }
  </style>
</head>
<body>${pagesHTML}</body>
</html>`;
};

// --- PDF Generation ---

export const generatePDFFromHTML = async (
  previewHTML: string,
  fileName: string = `TechnicalFile_${getTodayDate().replace(/\//g, '-')}.pdf`
): Promise<void> => {
  const pdfHTML = previewHTML
    .replace('margin: 0 auto 20px auto;', 'margin: 0 auto 0 auto;')
    .replace('vertical-align: top;', 'vertical-align: middle;')
    .replace('border: 1px solid #000;', 'border: 1px solid #000 !important;')
    .replace('padding: 8px;', 'padding: 6px !important;');

  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'absolute', left: '-9999px', top: '0', background: 'white', padding: '0'
  });
  container.innerHTML = pdfHTML;
  document.body.appendChild(container);

  await new Promise<void>((resolve) => {
    const images = container.querySelectorAll('img');
    if (images.length === 0) return resolve();
    let loaded = 0;
    images.forEach((img) => {
      const finish = () => { loaded++; if (loaded === images.length) resolve(); };
      if (img.complete) loaded++;
      else { img.onload = finish; img.onerror = finish; }
    });
    if (loaded === images.length) resolve();
  });

  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;
  const pdfWidth = 210;
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageElements = Array.from(container.querySelectorAll('.page'));

  for (let i = 0; i < pageElements.length; i++) {
    const pageElement = pageElements[i] as HTMLElement;
    const pageContent = pageElement.querySelector('.page-content');
    if (!pageContent || pageElement.innerHTML.trim() === '') continue;

    const pageCanvas = await html2canvas(pageElement, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      windowWidth: pdfWidth,
      windowHeight: 297,
    });

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, (pageCanvas.height * pdfWidth) / pageCanvas.width);
  }

  document.body.removeChild(container);
  pdf.save(fileName);
};
