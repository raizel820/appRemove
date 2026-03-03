/**
 * Document Templates & Header Component
 * Unified header for all documents with proper RTL/LTR support
 */

export interface DocumentHeaderData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string;
  logoPath?: string;
  // Additional fields for the new header template
  activityDescriptionAr?: string;
  activityDescriptionFr?: string;
  phoneNumbers?: string[];
  fax?: string;
  rcn?: string;
  nif?: string;
  nis?: string;
  rib?: string;
  bankName?: string;
  fundCapital?: number;
  currency?: string;
}

export interface DocumentData {
  type: 'INVOICE' | 'PROFORMA' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'NAMEPLATE';
  header: DocumentHeaderData;
  orderNumber: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerNif?: string;
  date: Date;
  dueDate?: Date;
  items: DocumentItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  language: 'ar' | 'en' | 'fr';
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  serialNumbers?: string[];
  specifications?: Record<string, any>;
}

export class DocumentTemplateGenerator {
  /**
   * Generate unified document header HTML
   * Based on the user's template: Top center company info, middle row with French/Arabic sides and centered logo
   */
  private generateHeader(data: DocumentHeaderData, language: 'ar' | 'en' | 'fr'): string {
    const phoneDisplay = data.companyPhone || (data.phoneNumbers ? (Array.isArray(data.phoneNumbers) ? data.phoneNumbers.join(' / ') : String(data.phoneNumbers)) : '');
    const capitalDisplay = data.fundCapital ? `${data.fundCapital.toLocaleString()} ${data.currency || ''}` : '';

    return `
      <header class="document-header">
        <!-- TOP CENTER -->
        <div class="header-top">
          <h1 class="company-title">${this.escapeHtml(data.companyName)}</h1>
          ${data.activityDescriptionAr ? `<p dir="rtl" class="activity-ar">${this.escapeHtml(data.activityDescriptionAr)}</p>` : ''}
          ${data.activityDescriptionFr ? `<p dir="ltr" class="activity-fr">${this.escapeHtml(data.activityDescriptionFr)}</p>` : ''}
        </div>

        <!-- MIDDLE ROW -->
        <div class="header-middle">
          <!-- LEFT: French -->
          <div dir="ltr" class="header-left">
            <p><strong>Tél :</strong> ${this.escapeHtml(phoneDisplay)}</p>
            ${data.fax ? `<p><strong>Fax :</strong> ${this.escapeHtml(data.fax)}</p>` : ''}
            ${data.companyAddress ? `<p><strong>Adresse :</strong> ${this.escapeHtml(data.companyAddress)}</p>` : ''}
            ${data.companyEmail ? `<p><strong>Email :</strong> ${this.escapeHtml(data.companyEmail)}</p>` : ''}
            ${data.rcn ? `<p><strong>RC N° :</strong> ${this.escapeHtml(data.rcn)}</p>` : ''}
            ${data.nif ? `<p><strong>NIF :</strong> ${this.escapeHtml(data.nif)}</p>` : ''}
            ${data.nis ? `<p><strong>NIS :</strong> ${this.escapeHtml(data.nis)}</p>` : ''}
            ${data.rib ? `<p><strong>RIB :</strong> ${this.escapeHtml(data.rib)}</p>` : ''}
            ${data.bankName ? `<p><strong>Agence bancaire :</strong> ${this.escapeHtml(data.bankName)}</p>` : ''}
            ${capitalDisplay ? `<p><strong>Capital Social :</strong> ${this.escapeHtml(capitalDisplay)}</p>` : ''}
          </div>

          <!-- CENTER: LOGO -->
          <div class="header-center">
            ${data.logoPath ? `
              <img src="${this.escapeHtml(data.logoPath)}" alt="Logo" class="company-logo" />
            ` : `
              <div class="logo-placeholder">LOGO</div>
            `}
          </div>

          <!-- RIGHT: Arabic -->
          <div dir="rtl" class="header-right">
            <p><strong>الهاتف:</strong> ${this.escapeHtml(phoneDisplay)}</p>
            ${data.fax ? `<p><strong>فاكس:</strong> ${this.escapeHtml(data.fax)}</p>` : ''}
            ${data.companyAddress ? `<p><strong>العنوان:</strong> ${this.escapeHtml(data.companyAddress)}</p>` : ''}
            ${data.companyEmail ? `<p><strong>البريد الإلكتروني:</strong> ${this.escapeHtml(data.companyEmail)}</p>` : ''}
            ${data.rcn ? `<p><strong>رقم السجل التجاري:</strong> ${this.escapeHtml(data.rcn)}</p>` : ''}
            ${data.nif ? `<p><strong>الرقم الجبائي:</strong> ${this.escapeHtml(data.nif)}</p>` : ''}
            ${data.nis ? `<p><strong>الرقم الإحصائي:</strong> ${this.escapeHtml(data.nis)}</p>` : ''}
            ${data.rib ? `<p><strong>رقم الحساب البنكي:</strong> ${this.escapeHtml(data.rib)}</p>` : ''}
            ${data.bankName ? `<p><strong>الوكالة البنكية:</strong> ${this.escapeHtml(data.bankName)}</p>` : ''}
            ${capitalDisplay ? `<p><strong>رأس المال:</strong> ${this.escapeHtml(capitalDisplay)}</p>` : ''}
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Generate complete document HTML
   */
  generateDocumentHTML(data: DocumentData): string {
    const isRTL = data.language === 'ar';
    const documentTitle = this.getDocumentTitle(data.type, data.language);

    return `
<!DOCTYPE html>
<html lang="${data.language}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(documentTitle)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, 'Arial Unicode MS', 'Segoe UI', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      padding: 0;
      background: white;
      color: #333;
    }
    @page {
      size: A4;
      margin: 15mm;
    }

    /* Header - Based on user's template */
    .document-header {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    .header-top {
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-top > * {
      margin-bottom: 4px;
    }
    .header-top > *:last-child {
      margin-bottom: 0;
    }
    .company-title {
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 0.025em;
      color: #1f2937;
      margin: 0;
    }
    .activity-ar,
    .activity-fr {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }
    .header-middle {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
      margin-top: 24px;
      align-items: start;
    }
    @media (min-width: 768px) {
      .header-middle {
        grid-template-columns: 1fr auto 1fr;
      }
    }
    .header-left,
    .header-right {
      font-size: 14px;
      line-height: 1.6;
    }
    .header-left p,
    .header-right p {
      margin: 0;
    }
    .header-center {
      display: flex;
      justify-content: center;
    }
    .company-logo {
      width: 128px;
      height: 96px;
      object-fit: contain;
    }
    .logo-placeholder {
      width: 128px;
      height: 96px;
      border: 2px dashed #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #6b7280;
    }

    /* Document Title */
    .document-title-section {
      text-align: center;
      margin-bottom: 30px;
    }
    .document-title {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .document-number {
      font-size: 14px;
      color: #6c757d;
    }

    /* Info Section */
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
      gap: 20px;
    }
    .info-block {
      flex: 1;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .info-label {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 5px;
      font-size: 10px;
      text-transform: uppercase;
    }
    .info-value {
      margin-bottom: 5px;
      color: #333;
    }

    /* Table */
    .document-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .document-table th,
    .document-table td {
      border: 1px solid #dee2e6;
      padding: 8px;
      text-align: ${isRTL ? 'right' : 'left'};
    }
    .document-table th {
      background: #2c3e50;
      color: white;
      font-weight: bold;
      font-size: 10px;
      text-transform: uppercase;
    }
    .document-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .document-table .number-cell,
    .document-table .price-cell {
      text-align: ${isRTL ? 'left' : 'right'};
    }
    .serial-numbers {
      font-size: 9px;
      color: #6c757d;
      font-style: italic;
      margin-top: 3px;
    }

    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .totals-block {
      width: 280px;
      border: 2px solid #2c3e50;
      padding: 15px;
      border-radius: 4px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .total-row.final {
      border-top: 2px solid #2c3e50;
      padding-top: 8px;
      font-weight: bold;
      font-size: 16px;
      margin-top: 10px;
      color: #2c3e50;
    }

    /* Notes */
    .notes-section {
      margin-top: 30px;
      padding: 15px;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
    }
    .notes-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #856404;
    }

    /* Footer */
    .document-footer {
      position: fixed;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      text-align: center;
      font-size: 9px;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
      padding-top: 10px;
    }

    /* Print styles */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .document-footer { position: fixed; }
    }

    /* Nameplate specific styles */
    .nameplate-container {
      border: 3px solid #2c3e50;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      background: #f8f9fa;
    }
    .nameplate-title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 15px;
      color: #2c3e50;
    }
    .nameplate-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .nameplate-field {
      padding: 10px;
      background: white;
      border: 1px solid #dee2e6;
      border-radius: 4px;
    }
    .nameplate-label {
      font-size: 10px;
      color: #6c757d;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .nameplate-value {
      font-size: 14px;
      font-weight: bold;
      color: #2c3e50;
    }
  </style>
</head>
<body>
  ${this.generateHeader(data.header, data.language)}

  <div class="document-title-section">
    <div class="document-title">${this.escapeHtml(documentTitle)}</div>
    <div class="document-number">${this.escapeHtml(data.orderNumber)}</div>
  </div>

  ${this.generateDocumentBody(data)}

  <div class="document-footer">
    ${data.companyName} - ${this.getLabel('generated', data.language)}: ${new Date().toLocaleString(data.language === 'ar' ? 'ar-SA' : 'fr-FR')}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate document body based on type
   */
  private generateDocumentBody(data: DocumentData): string {
    if (data.type === 'NAMEPLATE') {
      return this.generateNameplateBody(data);
    }
    return this.generateStandardDocumentBody(data);
  }

  /**
   * Generate standard document body (invoice, proforma, delivery note, PO)
   */
  private generateStandardDocumentBody(data: DocumentData): string {
    const isRTL = data.language === 'ar';

    return `
      <div class="info-section">
        <div class="info-block">
          <div class="info-label">${this.getLabel('customer', data.language)}</div>
          <div class="info-value"><strong>${this.escapeHtml(data.customerName)}</strong></div>
          ${data.customerAddress ? `<div class="info-value">${this.escapeHtml(data.customerAddress)}</div>` : ''}
          ${data.customerNif ? `<div class="info-value">${this.getLabel('nif', data.language)}: ${this.escapeHtml(data.customerNif)}</div>` : ''}
          ${data.customerPhone ? `<div class="info-value">${this.getLabel('phone', data.language)}: ${this.escapeHtml(data.customerPhone)}</div>` : ''}
          ${data.customerEmail ? `<div class="info-value">${this.getLabel('email', data.language)}: ${this.escapeHtml(data.customerEmail)}</div>` : ''}
        </div>
        <div class="info-block" style="text-align: ${isRTL ? 'left' : 'right'}">
          <div class="info-label">${this.getDocumentInfoLabel(data.type, data.language)}</div>
          <div class="info-value"><strong>${this.getLabel('date', data.language)}:</strong> ${data.date.toLocaleDateString(data.language === 'ar' ? 'ar-SA' : 'fr-FR')}</div>
          ${data.dueDate ? `<div class="info-value"><strong>${this.getLabel('dueDate', data.language)}:</strong> ${data.dueDate.toLocaleDateString(data.language === 'ar' ? 'ar-SA' : 'fr-FR')}</div>` : ''}
          <div class="info-value"><strong>${this.getLabel('number', data.language)}:</strong> ${this.escapeHtml(data.orderNumber)}</div>
        </div>
      </div>

      <table class="document-table">
        <thead>
          <tr>
            <th>${this.getLabel('description', data.language)}</th>
            <th class="number-cell">${this.getLabel('quantity', data.language)}</th>
            <th class="price-cell">${this.getLabel('unitPrice', data.language)}</th>
            <th class="number-cell">${this.getLabel('discount', data.language)}</th>
            <th class="price-cell">${this.getLabel('total', data.language)}</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>
                ${this.escapeHtml(item.description)}
                ${item.serialNumbers && item.serialNumbers.length > 0 ? `
                  <div class="serial-numbers">
                    ${this.getLabel('serials', data.language)}: ${item.serialNumbers.map(s => this.escapeHtml(s)).join(', ')}
                  </div>
                ` : ''}
              </td>
              <td class="number-cell">${item.quantity}</td>
              <td class="price-cell">${item.unitPrice.toFixed(2)} ${data.currency}</td>
              <td class="number-cell">${item.discount > 0 ? item.discount + '%' : '-'}</td>
              <td class="price-cell">${item.totalPrice.toFixed(2)} ${data.currency}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="totals-block">
          <div class="total-row">
            <span>${this.getLabel('subtotal', data.language)}:</span>
            <span>${data.subtotal.toFixed(2)} ${data.currency}</span>
          </div>
          ${data.taxRate > 0 ? `
            <div class="total-row">
              <span>${this.getLabel('tax', data.language)} (${data.taxRate}%):</span>
              <span>${data.taxAmount.toFixed(2)} ${data.currency}</span>
            </div>
          ` : ''}
          <div class="total-row final">
            <span>${this.getLabel('total', data.language)}:</span>
            <span>${data.total.toFixed(2)} ${data.currency}</span>
          </div>
        </div>
      </div>

      ${data.notes ? `
        <div class="notes-section">
          <div class="notes-title">${this.getLabel('notes', data.language)}</div>
          <div>${this.escapeHtml(data.notes)}</div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Generate nameplate body
   */
  private generateNameplateBody(data: DocumentData): string {
    const isRTL = data.language === 'ar';

    // For nameplate, we show specs of the main item
    const mainItem = data.items[0];
    const specs = mainItem?.specifications || {};

    // Filter specs to show only those with values
    const filteredSpecs = Object.entries(specs).filter(([_, value]) => value !== null && value !== undefined && value !== '');

    return `
      <div class="info-section">
        <div class="info-block">
          <div class="info-label">${this.getLabel('customer', data.language)}</div>
          <div class="info-value"><strong>${this.escapeHtml(data.customerName)}</strong></div>
          ${data.customerAddress ? `<div class="info-value">${this.escapeHtml(data.customerAddress)}</div>` : ''}
        </div>
        <div class="info-block" style="text-align: ${isRTL ? 'left' : 'right'}">
          <div class="info-label">${this.getLabel('machine', data.language)}</div>
          <div class="info-value"><strong>${this.escapeHtml(mainItem?.description || data.orderNumber)}</strong></div>
          ${mainItem?.serialNumbers && mainItem.serialNumbers.length > 0 ? `
            <div class="info-value">
              <strong>${this.getLabel('serial', data.language)}:</strong> ${this.escapeHtml(mainItem.serialNumbers[0])}
            </div>
          ` : ''}
          <div class="info-value">
            <strong>${this.getLabel('date', data.language)}:</strong> ${data.date.toLocaleDateString(data.language === 'ar' ? 'ar-SA' : 'fr-FR')}
          </div>
        </div>
      </div>

      <div class="nameplate-container">
        <div class="nameplate-title">${this.getLabel('machineSpecifications', data.language)}</div>
        <div class="nameplate-grid">
          ${filteredSpecs.map(([key, value]) => `
            <div class="nameplate-field">
              <div class="nameplate-label">${this.escapeHtml(key)}</div>
              <div class="nameplate-value">${this.escapeHtml(String(value))}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${data.notes ? `
        <div class="notes-section">
          <div class="notes-title">${this.getLabel('notes', data.language)}</div>
          <div>${this.escapeHtml(data.notes)}</div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Get document title based on type and language
   */
  private getDocumentTitle(type: string, language: string): string {
    const titles: Record<string, Record<string, string>> = {
      INVOICE: { en: 'INVOICE', fr: 'FACTURE', ar: 'فاتورة' },
      PROFORMA: { en: 'PROFORMA INVOICE', fr: 'FACTURE PROFORMA', ar: 'فاتورة شكلية' },
      DELIVERY_NOTE: { en: 'DELIVERY NOTE', fr: 'BON DE LIVRAISON', ar: 'إيصال تسليم' },
      PURCHASE_ORDER: { en: 'PURCHASE ORDER', fr: 'BON DE COMMANDE', ar: 'أمر شراء' },
      NAMEPLATE: { en: 'MACHINE NAMEPLATE', fr: 'PLAQUE NOM', ar: 'لوحة الاسم' },
    };

    return titles[type]?.[language] || titles[type]?.en || type;
  }

  /**
   * Get document info section label
   */
  private getDocumentInfoLabel(type: string, language: string): string {
    if (type === 'NAMEPLATE') return this.getLabel('plateInfo', language);
    return this.getLabel('documentInfo', language);
  }

  /**
   * Get label based on language
   */
  private getLabel(key: string, language: string): string {
    const labels: Record<string, Record<string, string>> = {
      customer: { en: 'Customer', fr: 'Client', ar: 'العميل' },
      date: { en: 'Date', fr: 'Date', ar: 'التاريخ' },
      dueDate: { en: 'Due Date', fr: 'Date d\'échéance', ar: 'تاريخ الاستحقاق' },
      nif: { en: 'Tax ID (NIF)', fr: 'NIF', ar: 'الرقم الجبائي' },
      description: { en: 'Description', fr: 'Description', ar: 'الوصف' },
      quantity: { en: 'Quantity', fr: 'Quantité', ar: 'الكمية' },
      unitPrice: { en: 'Unit Price', fr: 'Prix unitaire', ar: 'السعر الواحد' },
      discount: { en: 'Discount', fr: 'Remise', ar: 'خصم' },
      total: { en: 'Total', fr: 'Total', ar: 'المجموع' },
      subtotal: { en: 'Subtotal', fr: 'Sous-total', ar: 'المجموع الفرعي' },
      tax: { en: 'Tax', fr: 'TVA', ar: 'الضريبة' },
      notes: { en: 'Notes', fr: 'Notes', ar: 'ملاحظات' },
      number: { en: 'Number', fr: 'Numéro', ar: 'رقم' },
      phone: { en: 'Phone', fr: 'Téléphone', ar: 'الهاتف' },
      email: { en: 'Email', fr: 'Email', ar: 'البريد الإلكتروني' },
      serials: { en: 'Serial(s)', fr: 'N° Série', ar: 'رقم التسلسل' },
      serial: { en: 'Serial', fr: 'N° Série', ar: 'رقم التسلسل' },
      generated: { en: 'Generated', fr: 'Généré le', ar: 'تم الإنشاء' },
      documentInfo: { en: 'Document Information', fr: 'Informations du document', ar: 'معلومات الوثيقة' },
      plateInfo: { en: 'Nameplate Information', fr: 'Informations de la plaque', ar: 'معلومات اللوحة' },
      machine: { en: 'Machine', fr: 'Machine', ar: 'الآلة' },
      machineSpecifications: { en: 'Machine Specifications', fr: 'Spécifications de la machine', ar: 'مواصفات الآلة' },
    };

    return labels[key]?.[language] || labels[key]?.en || key;
  }

  /**
   * Create DocumentData from Order and Company objects
   * Helper method for order confirmation pipeline
   */
  createDocumentData(
    order: any,
    company: any,
    docType: 'INVOICE' | 'PROFORMA' | 'DELIVERY_NOTE' | 'PURCHASE_ORDER' | 'NAMEPLATE'
  ): DocumentData {
    const language = (order.documentLanguage || 'fr') as 'ar' | 'en' | 'fr';

    // Build header from company
    // Get active logo path from logos relation
    const activeLogo = company.logos?.find((logo: any) => logo.isActive);
    const logoPath = activeLogo ? `/logos/${activeLogo.filename}` : undefined;

    // Handle phone numbers (can be string or parsed JSON array)
    let phoneDisplay: string | undefined = undefined;
    if (company.phone) {
      phoneDisplay = company.phone;
    } else if (company.phoneNumbers) {
      try {
        const phones = typeof company.phoneNumbers === 'string'
          ? JSON.parse(company.phoneNumbers)
          : company.phoneNumbers;
        phoneDisplay = Array.isArray(phones) ? phones.join(' / ') : String(phones);
      } catch (e) {
        phoneDisplay = String(company.phoneNumbers);
      }
    }

    const header: DocumentHeaderData = {
      companyName: company.name,
      companyAddress: company.address || undefined,
      companyPhone: phoneDisplay || undefined,
      companyEmail: company.email || undefined,
      companyTaxId: company.nif || undefined,
      logoPath: logoPath,
      // New fields
      activityDescriptionAr: company.activityDescriptionAr || undefined,
      activityDescriptionFr: company.activityDescriptionFr || undefined,
      phoneNumbers: company.phoneNumbers || undefined,
      fax: company.fax || undefined,
      rcn: company.rcn || undefined,
      nif: company.nif || undefined,
      nis: company.nis || undefined,
      rib: company.rib || undefined,
      bankName: company.bankName || undefined,
      fundCapital: company.fundCapital || undefined,
      currency: company.currency || undefined,
    };

    // Build items array
    const items = (order.items || []).map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      totalPrice: item.totalPrice,
      serialNumbers: item.serialNumbers ? JSON.parse(item.serialNumbers) : undefined,
      specifications: item.specifications ? JSON.parse(item.specifications) : undefined,
    }));

    return {
      type: docType,
      header,
      orderNumber: order.fullNumber,
      customerName: order.customerName,
      customerAddress: order.customer?.address || undefined,
      customerEmail: order.customer?.email || undefined,
      customerPhone: order.customer?.phone || undefined,
      customerNif: order.customer?.nif || undefined,
      date: new Date(order.date),
      dueDate: order.dueDate ? new Date(order.dueDate) : undefined,
      items,
      subtotal: order.subtotal,
      taxRate: order.taxRate,
      taxAmount: order.taxAmount,
      total: order.total,
      currency: order.currency,
      notes: order.notes || undefined,
      language,
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

// Singleton instance
let templateGeneratorInstance: DocumentTemplateGenerator | null = null;

export function getDocumentTemplateGenerator(): DocumentTemplateGenerator {
  if (!templateGeneratorInstance) {
    templateGeneratorInstance = new DocumentTemplateGenerator();
  }
  return templateGeneratorInstance;
}
