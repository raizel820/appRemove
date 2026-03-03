import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.pDFConfiguration.findFirst();

  if (config) {
    console.log('Config ID:', config.id);
    console.log('\nProforma Terms Fields:');
    console.log('proformaPaymentMethod:', config.proformaPaymentMethod);
    console.log('proformaDeliveryTimeValue:', config.proformaDeliveryTimeValue);
    console.log('proformaDeliveryTimeUnit:', config.proformaDeliveryTimeUnit);
    console.log('proformaProformaValidityValue:', config.proformaProformaValidityValue);
    console.log('proformaProformaValidityUnit:', config.proformaProformaValidityUnit);
    console.log('proformaWarrantyValue:', config.proformaWarrantyValue);
    console.log('proformaWarrantyUnit:', config.proformaWarrantyUnit);
    console.log('\nTable Options:');
    console.log('proformaEmptyRows:', config.proformaEmptyRows);
    console.log('proformaMaxItemsPerPage:', config.proformaMaxItemsPerPage);
    console.log('invoiceEmptyRows:', config.invoiceEmptyRows);
    console.log('invoiceMaxItemsPerPage:', config.invoiceMaxItemsPerPage);
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
