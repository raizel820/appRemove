/**
 * Test Backup System API
 * This endpoint creates test data, tests backup, and verifies restore functionality
 * 
 * GET /api/test-backup - Run the full backup test
 * POST /api/test-backup - Create test data only
 * DELETE /api/test-backup - Clean up test data
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createBackup, restoreBackup, validateBackupFile, getDataTypeStats } from '@/server/services/backupService';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test data identifiers
const TEST_PREFIX = 'TEST_BACKUP_';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Create test data for all models
 */
async function createTestData(): Promise<{ [key: string]: { count: number; ids: string[] } }> {
  const results: { [key: string]: { count: number; ids: string[] } } = {};

  // 1. Update Company (singleton)
  let company = await db.company.findFirst();
  if (company) {
    company = await db.company.update({
      where: { id: company.id },
      data: {
        name: `${TEST_PREFIX}Test Company`,
        address: `${TEST_PREFIX}Test Address`,
        phoneNumbers: JSON.stringify(['+1234567890']),
        faxNumbers: JSON.stringify(['+1112223333']),
        emails: JSON.stringify(['test@example.com']),
        nif: `${TEST_PREFIX}NIF123`,
        nis: `${TEST_PREFIX}NIS456`,
        rib: `${TEST_PREFIX}RIB789`,
        rcn: `${TEST_PREFIX}RCN012`,
        bankName: `${TEST_PREFIX}Test Bank`,
        fundCapital: 100000,
        activityDescriptionAr: `${TEST_PREFIX}وصف النشاط`,
        activityDescriptionFr: `${TEST_PREFIX}Description de l'activité`,
        currency: 'EUR',
        defaultLanguage: 'fr',
      },
    });
    results['company'] = { count: 1, ids: [company.id] };
  } else {
    company = await db.company.create({
      data: {
        name: `${TEST_PREFIX}Test Company`,
        address: `${TEST_PREFIX}Test Address`,
        phoneNumbers: JSON.stringify(['+1234567890']),
        currency: 'EUR',
        defaultLanguage: 'fr',
      },
    });
    results['company'] = { count: 1, ids: [company.id] };
  }

  // 2. Create Company Profile
  const profile = await db.companyProfile.create({
    data: {
      companyId: company.id,
      profileNumber: 99,
      profileName: `${TEST_PREFIX}Test Profile`,
      nif: `${TEST_PREFIX}ProfileNIF`,
      nis: `${TEST_PREFIX}ProfileNIS`,
      rcn: `${TEST_PREFIX}ProfileRCN`,
      rib: `${TEST_PREFIX}ProfileRIB`,
      bankName: `${TEST_PREFIX}Profile Bank`,
      fundCapital: 50000,
      isActive: false,
    },
  });
  results['companyProfiles'] = { count: 1, ids: [profile.id] };

  // 3. Ensure PDF Configuration exists
  let pdfConfig = await db.pDFConfiguration.findFirst();
  if (!pdfConfig) {
    pdfConfig = await db.pDFConfiguration.create({
      data: {},
    });
  }
  results['pdfConfiguration'] = { count: 1, ids: [pdfConfig.id] };

  // 4. Ensure QR Code Settings exists
  let qrSettings = await db.qRCodeSettings.findFirst();
  if (!qrSettings) {
    qrSettings = await db.qRCodeSettings.create({
      data: {
        config: JSON.stringify({ test: true }),
      },
    });
  }
  results['qrCodeSettings'] = { count: 1, ids: [qrSettings.id] };

  // 5. Create Customer
  const customer = await db.customer.create({
    data: {
      code: `${TEST_PREFIX}CUST001`,
      fullName: `${TEST_PREFIX}Test Customer Full Name`,
      shortName: `${TEST_PREFIX}TestCust`,
      address: `${TEST_PREFIX}123 Test Street`,
      city: 'Test City',
      country: 'Test Country',
      phone: '+1234567890',
      email: 'testcustomer@example.com',
      nif: `${TEST_PREFIX}CustNIF`,
      nis: `${TEST_PREFIX}CustNIS`,
      rib: `${TEST_PREFIX}CustRIB`,
      rcn: `${TEST_PREFIX}CustRCN`,
      notes: `${TEST_PREFIX}Test customer notes`,
    },
  });
  results['customers'] = { count: 1, ids: [customer.id] };

  // 6. Create Customer Search
  await db.customerSearch.create({
    data: {
      customerId: customer.id,
      fullName: customer.fullName,
      shortName: customer.shortName,
      email: customer.email || '',
      phone: customer.phone || '',
      nif: customer.nif,
      nis: customer.nis,
      rib: customer.rib,
      rcn: customer.rcn,
      city: customer.city,
    },
  });
  results['customerSearch'] = { count: 1, ids: [customer.id] };

  // 7. Create Machine Family
  const family = await db.machineFamily.create({
    data: {
      name: `${TEST_PREFIX}Test Machine Family`,
      description: `${TEST_PREFIX}Test family description`,
      code: `${TEST_PREFIX}TMF`,
      modelSpecs: true,
    },
  });
  results['machineFamilies'] = { count: 1, ids: [family.id] };

  // 8. Create Spec Template (for MachineModel.specTemplateId)
  const specTemplate = await db.specTemplate.create({
    data: {
      name: `${TEST_PREFIX}Test Spec Template`,
      description: `${TEST_PREFIX}Test spec template description`,
      category: 'mechanical',
      fields: JSON.stringify(['field1', 'field2', 'field3']),
      isActive: true,
    },
  });
  results['specTemplates'] = { count: 1, ids: [specTemplate.id] };

  // 9. Create Spec Definition
  const specDef = await db.specDefinition.create({
    data: {
      code: `${TEST_PREFIX}SPEC001`,
      type: 'number',
      unit: 'mm',
      labelFr: `${TEST_PREFIX}Spécification Test`,
      labelEn: `${TEST_PREFIX}Test Specification`,
      labelAr: `${TEST_PREFIX}مواصفات اختبار`,
      category: 'mechanical',
      isActive: true,
      sortOrder: 1,
    },
  });
  results['specDefinitions'] = { count: 1, ids: [specDef.id] };

  // 10. Create Machine Model
  const machineModel = await db.machineModel.create({
    data: {
      familyId: family.id,
      name: `${TEST_PREFIX}Test Machine Model`,
      code: `${TEST_PREFIX}TMM001`,
      description: `${TEST_PREFIX}Test model description`,
      basePrice: 5000.00,
      currency: 'EUR',
      specTemplateId: specTemplate.id,
      isManufactured: true,
    },
  });
  results['machineModels'] = { count: 1, ids: [machineModel.id] };

  // 11. Create Model Spec
  const modelSpec = await db.modelSpec.create({
    data: {
      modelId: machineModel.id,
      specDefinitionId: specDef.id,
      value: `${TEST_PREFIX}500`,
      sortOrder: 1,
    },
  });
  results['modelSpecs'] = { count: 1, ids: [modelSpec.id] };

  // 12. Create Serial Number Counter
  const serialCounter = await db.serialNumberCounter.create({
    data: {
      year: 2026,
      lastCounter: 100,
    },
  });
  results['serialNumberCounter'] = { count: 1, ids: [serialCounter.id] };

  // 13. Create Order Number (non-year based)
  const orderNumber = await db.orderNumber.create({
    data: {
      number: 99999,
      state: 'USED',
      notes: `${TEST_PREFIX}Test order number`,
    },
  });
  results['orderNumbers'] = { count: 1, ids: [orderNumber.number.toString()] };

  // 14. Create Order Numbers (Year-based)
  const orderNumbersYear = await db.orderNumbers.create({
    data: {
      year: 2026,
      seq: 999,
      state: 'USED',
    },
  });
  results['orderNumbersYear'] = { count: 1, ids: [orderNumbersYear.id] };

  // 15. Create Invoice Numbers
  const invoiceNumber = await db.invoiceNumbers.create({
    data: {
      year: 2026,
      seq: 999,
      state: 'USED',
    },
  });
  results['invoiceNumbers'] = { count: 1, ids: [invoiceNumber.id] };

  // 16. Create Proforma Numbers
  const proformaNumber = await db.proformaNumbers.create({
    data: {
      year: 2026,
      seq: 999,
      state: 'USED',
    },
  });
  results['proformaNumbers'] = { count: 1, ids: [proformaNumber.id] };

  // 17. Create Purchase Order Numbers
  const poNumber = await db.purchaseOrderNumbers.create({
    data: {
      year: 2026,
      seq: 999,
      state: 'USED',
    },
  });
  results['purchaseOrderNumbers'] = { count: 1, ids: [poNumber.id] };

  // 18. Create Delivery Numbers
  const deliveryNumber = await db.deliveryNumbers.create({
    data: {
      year: 2026,
      seq: 999,
      state: 'USED',
    },
  });
  results['deliveryNumbers'] = { count: 1, ids: [deliveryNumber.id] };

  // 19. Create Order
  const order = await db.order.create({
    data: {
      type: 'INVOICE',
      orderNumber: orderNumber.number,
      numberYear: 2026,
      numberSequence: 999,
      fullNumber: `${TEST_PREFIX}999/2026`,
      customerId: customer.id,
      customerName: customer.fullName,
      date: new Date(),
      status: 'DRAFT',
      currency: 'EUR',
      subtotal: 5000.00,
      taxRate: 19,
      taxAmount: 950.00,
      total: 5950.00,
      notes: `${TEST_PREFIX}Test order notes`,
      documentLanguage: 'fr',
      snapshotCompany: JSON.stringify({ name: company.name }),
      snapshotCustomer: JSON.stringify({ name: customer.fullName }),
      snapshotPdfConfig: JSON.stringify({ fontSize: 12 }),
    },
  });
  results['orders'] = { count: 1, ids: [order.id] };

  // 20. Create Order Item
  const orderItem = await db.orderItem.create({
    data: {
      orderId: order.id,
      modelId: machineModel.id,
      description: `${TEST_PREFIX}Test Order Item`,
      quantity: 2,
      unitPrice: 2500.00,
      discount: 0,
      totalPrice: 5000.00,
      serialNumbers: JSON.stringify(['SN001', 'SN002']),
      specifications: JSON.stringify({ custom: 'value' }),
      isCustomized: false,
      snapshotModel: JSON.stringify({ name: machineModel.name, code: machineModel.code }),
    },
  });
  results['orderItems'] = { count: 1, ids: [orderItem.id] };

  // 21. Create Document Split
  const docSplit = await db.documentSplit.create({
    data: {
      orderId: order.id,
      documentType: 'invoice',
      splitIndex: 0,
      itemIds: JSON.stringify([orderItem.id]),
      number: `${TEST_PREFIX}INV-SPLIT-001/2026`,
      sequence: 1,
      year: 2026,
      date: new Date(),
      status: 'ISSUED',
      verificationToken: `${TEST_PREFIX}test-token-123`,
    },
  });
  results['documentSplits'] = { count: 1, ids: [docSplit.id] };

  // 22. Create File
  const file = await db.file.create({
    data: {
      orderId: order.id,
      fileType: 'INVOICE',
      numberYear: 2026,
      numberSequence: 999,
      fullNumber: `${TEST_PREFIX}FILE-999/2026`,
      fileDate: new Date(),
      status: 'READY',
      templateVersion: { version: '1.0' },
      notes: `${TEST_PREFIX}Test file`,
    },
  });
  results['files'] = { count: 1, ids: [file.id] };

  // 23. Create File Revision
  const fileRevision = await db.fileRevision.create({
    data: {
      fileId: file.id,
      revisionNumber: 1,
      pdfPath: '/test/path.pdf',
      templateVersion: { version: '1.0' },
      changes: JSON.stringify({ updated: true }),
      createdBy: `${TEST_PREFIX}test`,
    },
  });
  results['fileRevisions'] = { count: 1, ids: [fileRevision.id] };

  // 24. Create File Sequence
  const fileSequence = await db.fileSequence.create({
    data: {
      fileType: 'INVOICE',
      year: 2026,
      sequence: 999,
    },
  });
  results['fileSequences'] = { count: 1, ids: [fileSequence.id] };

  // 25. Create Audit Log
  const auditLog = await db.auditLog.create({
    data: {
      entityType: 'Order',
      entityId: order.id,
      action: 'CREATE',
      changes: JSON.stringify({ created: true }),
      customerId: customer.id,
      orderId: order.id,
    },
  });
  results['auditLogs'] = { count: 1, ids: [auditLog.id] };

  // 26. Create Order Search
  await db.orderSearch.create({
    data: {
      orderId: order.id,
      type: order.type,
      fullNumber: order.fullNumber,
      customerName: order.customerName,
      notes: order.notes,
      status: order.status,
      total: order.total,
      currency: order.currency,
      date: order.date,
    },
  });
  results['orderSearch'] = { count: 1, ids: [order.id] };

  // 27. Create Serial Search
  const serialSearch = await db.serialSearch.create({
    data: {
      orderItemId: orderItem.id,
      serialNumber: `${TEST_PREFIX}SN001`,
      orderId: order.id,
      description: `${TEST_PREFIX}Test serial`,
    },
  });
  results['serialSearch'] = { count: 1, ids: [serialSearch.id] };

  // 28. Create Verification Token
  const verificationToken = await db.verificationToken.create({
    data: {
      token: `${TEST_PREFIX}test-token-${Date.now()}`,
      qrJsonData: JSON.stringify({ test: true }),
      label: `${TEST_PREFIX}test`,
    },
  });
  results['verificationTokens'] = { count: 1, ids: [verificationToken.id] };

  return results;
}

/**
 * Clean up test data
 */
async function cleanupTestData(): Promise<void> {
  // Delete in reverse order of creation (respecting foreign keys)
  
  // Level 10: Most dependent
  await db.verificationToken.deleteMany({ where: { label: { contains: TEST_PREFIX } } });
  await db.serialSearch.deleteMany({ where: { description: { contains: TEST_PREFIX } } });
  await db.orderSearch.deleteMany({ where: { notes: { contains: TEST_PREFIX } } });
  await db.auditLog.deleteMany({ where: { changes: { contains: TEST_PREFIX } } });
  
  // Level 9
  await db.fileRevision.deleteMany({ where: { createdBy: { contains: TEST_PREFIX } } });
  await db.fileSequence.deleteMany({ where: { fileType: 'INVOICE', year: 2026, sequence: 999 } });
  await db.file.deleteMany({ where: { notes: { contains: TEST_PREFIX } } });
  
  // Level 8
  await db.documentSplit.deleteMany({ where: { verificationToken: { contains: TEST_PREFIX } } });
  await db.orderItem.deleteMany({ where: { description: { contains: TEST_PREFIX } } });
  
  // Level 7
  await db.order.deleteMany({ where: { notes: { contains: TEST_PREFIX } } });
  
  // Level 6: Number tables
  await db.deliveryNumbers.deleteMany({ where: { seq: 999 } });
  await db.purchaseOrderNumbers.deleteMany({ where: { seq: 999 } });
  await db.proformaNumbers.deleteMany({ where: { seq: 999 } });
  await db.invoiceNumbers.deleteMany({ where: { seq: 999 } });
  await db.orderNumbers.deleteMany({ where: { seq: 999 } });
  await db.orderNumber.deleteMany({ where: { notes: { contains: TEST_PREFIX } } });
  
  // Level 5
  await db.serialNumberCounter.deleteMany({ where: { year: 2026 } });
  
  // Level 4
  await db.modelSpec.deleteMany({ where: { value: `${TEST_PREFIX}500` } });
  await db.machineModel.deleteMany({ where: { code: { contains: TEST_PREFIX } } });
  await db.specDefinition.deleteMany({ where: { code: { contains: TEST_PREFIX } } });
  await db.specTemplate.deleteMany({ where: { name: { contains: TEST_PREFIX } } });
  await db.machineFamily.deleteMany({ where: { code: { contains: TEST_PREFIX } } });
  
  // Level 3
  await db.customerSearch.deleteMany({ where: { fullName: { contains: TEST_PREFIX } } });
  await db.customer.deleteMany({ where: { code: { contains: TEST_PREFIX } } });
  
  // Level 2: Singleton tables - reset to default
  const company = await db.company.findFirst();
  if (company && company.name.includes(TEST_PREFIX)) {
    await db.company.update({
      where: { id: company.id },
      data: {
        name: 'EURL LA SOURCE',
        address: '',
        phoneNumbers: '[]',
        faxNumbers: '[]',
        emails: '[]',
        nif: null,
        nis: null,
        rib: null,
        rcn: null,
        bankName: null,
        fundCapital: null,
        activityDescriptionAr: '',
        activityDescriptionFr: '',
      },
    });
  }
  
  // Level 1
  await db.companyProfile.deleteMany({ where: { profileName: { contains: TEST_PREFIX } } });
}

/**
 * Get record counts for verification
 */
async function getRecordCounts(): Promise<{ [key: string]: number }> {
  const counts: { [key: string]: number } = {};
  
  counts['company'] = await db.company.count();
  counts['companyProfiles'] = await db.companyProfile.count();
  counts['pdfConfiguration'] = await db.pDFConfiguration.count();
  counts['qrCodeSettings'] = await db.qRCodeSettings.count();
  counts['customers'] = await db.customer.count();
  counts['customerSearch'] = await db.customerSearch.count();
  counts['machineFamilies'] = await db.machineFamily.count();
  counts['machineModels'] = await db.machineModel.count();
  counts['specTemplates'] = await db.specTemplate.count();
  counts['specDefinitions'] = await db.specDefinition.count();
  counts['modelSpecs'] = await db.modelSpec.count();
  counts['serialNumberCounter'] = await db.serialNumberCounter.count();
  counts['orderNumbers'] = await db.orderNumber.count();
  counts['orderNumbersYear'] = await db.orderNumbers.count();
  counts['invoiceNumbers'] = await db.invoiceNumbers.count();
  counts['proformaNumbers'] = await db.proformaNumbers.count();
  counts['purchaseOrderNumbers'] = await db.purchaseOrderNumbers.count();
  counts['deliveryNumbers'] = await db.deliveryNumbers.count();
  counts['orders'] = await db.order.count();
  counts['orderItems'] = await db.orderItem.count();
  counts['documentSplits'] = await db.documentSplit.count();
  counts['files'] = await db.file.count();
  counts['fileSequences'] = await db.fileSequence.count();
  counts['fileRevisions'] = await db.fileRevision.count();
  counts['auditLogs'] = await db.auditLog.count();
  counts['orderSearch'] = await db.orderSearch.count();
  counts['serialSearch'] = await db.serialSearch.count();
  counts['verificationTokens'] = await db.verificationToken.count();
  
  return counts;
}

/**
 * Run full backup test
 */
async function runFullTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  try {
    // Step 1: Clean up any existing test data
    results.push({ step: 'cleanup_before', success: true, message: 'Cleaning up existing test data' });
    await cleanupTestData();
    
    // Step 2: Create test data
    results.push({ step: 'create_test_data', success: true, message: 'Creating test data' });
    const createResults = await createTestData();
    const createCount = Object.values(createResults).reduce((sum, r) => sum + r.count, 0);
    results[results.length - 1].data = createResults;
    results[results.length - 1].message = `Created ${createCount} test records across ${Object.keys(createResults).length} data types`;
    
    // Step 3: Get counts before backup
    const countsBefore = await getRecordCounts();
    results.push({ step: 'counts_before', success: true, message: 'Recorded counts before backup', data: countsBefore });
    
    // Step 4: Create backup with all data types
    results.push({ step: 'create_backup', success: true, message: 'Creating backup' });
    const allDataTypes = [
      'company', 'companyProfiles', 'companyLogos', 'pdfConfiguration', 'qrCodeSettings',
      'customers', 'machineFamilies', 'machineModels', 'specTemplates', 'specDefinitions', 'modelSpecs',
      'orders', 'orderItems', 'documentSplits',
      'orderNumbers', 'orderNumbersYear', 'invoiceNumbers', 'proformaNumbers', 
      'purchaseOrderNumbers', 'deliveryNumbers', 'serialNumberCounter',
      'auditLogs', 'customerSearch', 'orderSearch', 'serialSearch',
      'files', 'fileSequences', 'fileRevisions', 'verificationTokens',
    ] as any[];
    
    const backupResult = await createBackup({
      description: 'Full backup test',
      dataTypes: allDataTypes,
    });
    results[results.length - 1].data = backupResult;
    results[results.length - 1].message = `Backup created: ${backupResult.filename} with ${backupResult.recordCount} records`;
    
    // Step 5: Read backup file
    results.push({ step: 'read_backup', success: true, message: 'Reading backup file' });
    const backupContent = readFileSync(
      join(process.cwd(), 'backups', backupResult.filename),
      'utf-8'
    );
    const validation = validateBackupFile(backupContent);
    
    if (!validation.valid) {
      results[results.length - 1].success = false;
      results[results.length - 1].error = validation.error;
      return results;
    }
    results[results.length - 1].data = {
      filename: backupResult.filename,
      validation: validation.backup?.metadata,
      dataTypesCount: Object.keys(validation.backup?.data || {}).length,
    };
    
    // Step 6: Clean up all data
    results.push({ step: 'cleanup_all', success: true, message: 'Cleaning up all test data' });
    await cleanupTestData();
    
    // Step 7: Get counts after cleanup
    const countsAfterCleanup = await getRecordCounts();
    results.push({ step: 'counts_after_cleanup', success: true, message: 'Recorded counts after cleanup', data: countsAfterCleanup });
    
    // Step 8: Restore from backup
    results.push({ step: 'restore', success: true, message: 'Restoring from backup' });
    const restoreResult = await restoreBackup(validation.backup!, { overwrite: true });
    results[results.length - 1].data = restoreResult;
    results[results.length - 1].message = restoreResult.message;
    
    // Step 9: Get counts after restore
    const countsAfterRestore = await getRecordCounts();
    results.push({ step: 'counts_after_restore', success: true, message: 'Recorded counts after restore', data: countsAfterRestore });
    
    // Step 10: Verify restore
    const verification: { [key: string]: { before: number; after: number; match: boolean } } = {};
    let allMatch = true;
    
    for (const key of Object.keys(countsBefore)) {
      const before = countsBefore[key];
      const after = countsAfterRestore[key];
      const match = before === after;
      if (!match) allMatch = false;
      verification[key] = { before, after, match };
    }
    
    results.push({
      step: 'verification',
      success: allMatch,
      message: allMatch ? 'All records restored correctly!' : 'Some records do not match!',
      data: verification,
    });
    
    // Step 11: Final cleanup
    results.push({ step: 'final_cleanup', success: true, message: 'Performing final cleanup' });
    await cleanupTestData();
    
  } catch (error: any) {
    results.push({
      step: 'error',
      success: false,
      message: 'Test failed with error',
      error: `${error.message}\n${error.stack}`,
    });
  }
  
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const results = await runFullTest();
    
    const success = results.every(r => r.success);
    
    return NextResponse.json({
      success,
      message: success ? 'All backup tests passed!' : 'Some tests failed',
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const results = await createTestData();
    const count = Object.values(results).reduce((sum, r) => sum + r.count, 0);
    
    return NextResponse.json({
      success: true,
      message: `Created ${count} test records`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `${error.message}\n${error.stack}`,
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await cleanupTestData();
    
    return NextResponse.json({
      success: true,
      message: 'Test data cleaned up successfully',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
