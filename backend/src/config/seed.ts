import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@medicare.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@medicare.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // Pharmacist user
  const pharmaHash = await bcrypt.hash('pharma123', 12);
  await prisma.user.upsert({
    where: { email: 'pharmacist@medicare.com' },
    update: {},
    create: {
      name: 'John Pharmacist',
      email: 'pharmacist@medicare.com',
      passwordHash: pharmaHash,
      role: 'PHARMACIST',
    },
  });

  // Categories
  const categories = [
    'Antibiotics', 'Analgesics', 'Antihypertensives', 'Antidiabetics',
    'Antihistamines', 'Vitamins & Supplements', 'Antacids', 'Cough & Cold',
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Sample supplier
  await prisma.supplier.upsert({
    where: { id: 'seed-supplier-1' },
    update: {},
    create: {
      id: 'seed-supplier-1',
      name: 'Himalayan Pharma Distributors',
      contactName: 'Ram Sharma',
      phone: '9801234567',
      email: 'contact@himalayan-pharma.com',
      address: 'Kathmandu, Nepal',
    },
  });

  console.log('Seed complete.');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin      -> admin@medicare.com       / admin123');
  console.log('  Pharmacist -> pharmacist@medicare.com  / pharma123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
