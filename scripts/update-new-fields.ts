import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.pDFConfiguration.findFirst();

  if (config) {
    console.log('Updating configuration ID:', config.id);

    const updated = await prisma.pDFConfiguration.update({
      where: { id: config.id },
      data: {
        // Add missing proforma fields
        proformaPaymentMethod: "full_payment",
        proformaDeliveryTimeValue: 3,
        proformaDeliveryTimeUnit: "months",
        proformaProformaValidityValue: 3,
        proformaProformaValidityUnit: "months",
        proformaWarrantyValue: 12,
        proformaWarrantyUnit: "months",
        proformaEmptyRows: 8,
        proformaMaxItemsPerPage: 15,
        // Add missing invoice fields
        invoiceEmptyRows: 8,
        invoiceMaxItemsPerPage: 15,
      },
    });

    console.log('Configuration updated successfully');
    console.log('proformaPaymentMethod:', updated.proformaPaymentMethod);
    console.log('proformaDeliveryTimeValue:', updated.proformaDeliveryTimeValue);
    console.log('proformaWarrantyValue:', updated.proformaWarrantyValue);
    console.log('proformaEmptyRows:', updated.proformaEmptyRows);
    console.log('proformaMaxItemsPerPage:', updated.proformaMaxItemsPerPage);
  } else {
    console.log('No configuration found');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
