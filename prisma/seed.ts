import bcrypt from 'bcrypt';
import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'roshan1234567';

  // 1. Seed default active departments for student & teacher registration
  const defaultDepartments = [
    { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science & Software Systems' },
    { code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Department of Electronics & Signal Processing' },
    { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical & Industrial Engineering' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering', description: 'Department of Electrical Engineering & Power Systems' },
  ];

  for (const dept of defaultDepartments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description, isActive: true },
      create: { code: dept.code, name: dept.name, description: dept.description, isActive: true },
    });
  }

  // 2. Seed Admin User
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      firstName: 'System',
      lastName: 'Administrator',
      email,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  console.log('Successfully seeded default departments and admin user.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
