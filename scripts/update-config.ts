import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Update the existing configuration to add default proformaTermsTitle
  const config = await prisma.pDFConfiguration.findFirst();

  if (config) {
    console.log('Updating configuration ID:', config.id);

    const updated = await prisma.pDFConfiguration.update({
      where: { id: config.id },
      data: {
        proformaTermsTitle: "Modalités de paiement, livraison et garantie :",
        proformaClientLabelText: "Client :",
        proformaLocationDateLabelText: "M'sila le",
        proformaSignatureLeftLabelText: "Gérant",
        proformaSignatureRightLabelText: "Client",
      },
    });

    console.log('Configuration updated successfully');
    console.log('New proformaTermsTitle:', updated.proformaTermsTitle);
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
