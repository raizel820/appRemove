const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  console.log("Total customers:", customers.length);
  console.log("\nActive customers:");
  customers.forEach(c => {
    const status = c.deletedAt ? `SOFT-DELETED` : `ACTIVE`;
    console.log(`  ${c.code} | ${c.fullName} | ${status}`);
  });
  
  await prisma.$disconnect();
}

check();
