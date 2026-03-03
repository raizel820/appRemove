import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.pDFConfiguration.findFirst();

  if (config) {
    console.log('Updating configuration ID:', config.id);

    const updated = await prisma.pDFConfiguration.update({
      where: { id: config.id },
      data: {
        // Add new delivery time fields
        proformaDeliveryTimeType: "range",
        proformaDeliveryTimeToValue: 4,
      },
    });

    console.log('Configuration updated successfully');
    console.log('proformaDeliveryTimeType:', updated.proformaDeliveryTimeType);
    console.log('proformaDeliveryTimeValue:', updated.proformaDeliveryTimeValue);
    console.log('proformaDeliveryTimeToValue:', updated.proformaDeliveryTimeToValue);
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
