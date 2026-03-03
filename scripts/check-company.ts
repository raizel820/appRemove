import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    include: {
      logos: true,
    },
  });

  if (company) {
    console.log('Company found:');
    console.log('ID:', company.id);
    console.log('Name:', company.name);
    console.log('Has logos:', company.logos && company.logos.length > 0);
    console.log('Active logo ID:', company.activeLogoId);
  } else {
    console.log('No company found');
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
