import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.pDFConfiguration.findFirst();

  if (config) {
    console.log('Migrating configuration to new signature system...');

    // Get current signature labels
    const leftLabel = config.proformaSignatureLeftLabelText || "Gérant";
    const rightLabel = config.proformaSignatureRightLabelText || "Client";

    // Create default signatures array
    const defaultSignatures = [
      {
        id: "1",
        type: "manager",
        label_en: "Manager",
        label_fr: leftLabel,
        label_ar: leftLabel === "Gérant" ? "المدير" : "المدير العام",
        enabled: true
      },
      {
        id: "2",
        type: "director",
        label_en: "Director",
        label_fr: "Directeur",
        label_ar: "المدير العام",
        enabled: true
      },
      {
        id: "3",
        type: "shareholder",
        label_en: "Shareholder",
        label_fr: "Actionnaire",
        label_ar: "المساهم",
        enabled: false
      },
      {
        id: "4",
        type: "customer",
        label_en: "Customer",
        label_fr: rightLabel,
        label_ar: "العميل",
        enabled: true
      }
    ];

    const updated = await prisma.pDFConfiguration.update({
      where: { id: config.id },
      data: {
        proformaSignatures: JSON.stringify(defaultSignatures),
        proformaSignaturesToUse: JSON.stringify(["1", "2", "4"]) // Use first 4 signatures by default
      },
    });

    console.log('Configuration migrated successfully!');
    console.log('Signatures:', JSON.parse(updated.proformaSignatures));
    console.log('Signatures to use:', JSON.parse(updated.proformaSignaturesToUse));
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
