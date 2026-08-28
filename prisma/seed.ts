import bcrypt from 'bcrypt';
import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = process.env.SEED_USER_PASSWORD ?? 'roshan1234567';
  const passwordHash = await bcrypt.hash(password, 12);

  // 1. Seed default active departments
  const defaultDepartments = [
    { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science & Software Systems' },
    { code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Department of Electronics & Signal Processing' },
    { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical & Industrial Engineering' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering', description: 'Department of Electrical Engineering & Power Systems' },
  ];

  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: { name: 'Computer Science & Engineering', description: 'Department of Computer Science & Software Systems', isActive: true },
    create: { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science & Software Systems', isActive: true },
  });

  for (const dept of defaultDepartments) {
    if (dept.code !== 'CSE') {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: { name: dept.name, description: dept.description, isActive: true },
        create: { code: dept.code, name: dept.name, description: dept.description, isActive: true },
      });
    }
  }

  // 2. Seed Admin User
  const adminEmail = 'admin@example.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      firstName: 'System',
      lastName: 'Administrator',
      email: adminEmail,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });

  // 3. Seed CSE HOD User
  const hodEmail = 'hod.cse@example.com';
  const hodUser = await prisma.user.upsert({
    where: { email: hodEmail },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: hodEmail,
      role: Role.HOD,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });
  await prisma.hodProfile.upsert({
    where: { userId: hodUser.id },
    update: { departmentId: cseDept.id },
    create: {
      userId: hodUser.id,
      departmentId: cseDept.id,
      employeeNumber: 'HODCSE001',
    },
  });

  // 4. Seed CSE Teacher User
  const teacherEmail = 'teacher.cse@example.com';
  const teacherUser = await prisma.user.upsert({
    where: { email: teacherEmail },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      firstName: 'Priya',
      lastName: 'Sharma',
      email: teacherEmail,
      role: Role.TEACHER,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: { departmentId: cseDept.id },
    create: {
      userId: teacherUser.id,
      departmentId: cseDept.id,
      employeeNumber: 'TCHCSE001',
      designation: 'Assistant Professor',
      qualification: 'M.Tech in CS',
    },
  });

  // 5. Seed CSE Student User (Fully Approved & Active)
  const studentEmail = 'student.cse@example.com';
  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { passwordHash, status: UserStatus.ACTIVE },
    create: {
      firstName: 'Arjun',
      lastName: 'Patel',
      email: studentEmail,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      passwordHash,
    },
  });
  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: { departmentId: cseDept.id },
    create: {
      userId: studentUser.id,
      departmentId: cseDept.id,
      registerNumber: 'CSE2024001',
      admissionYear: 2024,
      academicYear: 2024,
      semester: 1,
      section: 'A',
    },
  });

  // 6. Seed Default CSE Subjects
  await prisma.subject.upsert({
    where: { code: 'CS101' },
    update: { departmentId: cseDept.id },
    create: {
      code: 'CS101',
      name: 'Data Structures & Algorithms',
      description: 'Core concepts of linear and non-linear data structures.',
      credits: 4,
      semester: 1,
      departmentId: cseDept.id,
    },
  });

  await prisma.subject.upsert({
    where: { code: 'CS102' },
    update: { departmentId: cseDept.id },
    create: {
      code: 'CS102',
      name: 'Database Management Systems',
      description: 'Relational database design, SQL, and indexing.',
      credits: 3,
      semester: 1,
      departmentId: cseDept.id,
    },
  });

  console.log('Successfully seeded CSE users (Admin, HOD, Teacher, Student) and subjects.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
