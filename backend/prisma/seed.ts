import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { slug: 'company.read', name: 'View Company', module: 'company' },
  { slug: 'company.create', name: 'Create Company', module: 'company' },
  { slug: 'company.update', name: 'Update Company', module: 'company' },
  { slug: 'masters.read', name: 'View Masters', module: 'masters' },
  { slug: 'masters.create', name: 'Create Masters', module: 'masters' },
  { slug: 'masters.update', name: 'Update Masters', module: 'masters' },
  { slug: 'masters.delete', name: 'Delete Masters', module: 'masters' },
  { slug: 'employees.read', name: 'View Employees', module: 'employees' },
  { slug: 'employees.create', name: 'Create Employees', module: 'employees' },
  { slug: 'employees.update', name: 'Update Employees', module: 'employees' },
  { slug: 'employees.delete', name: 'Delete Employees', module: 'employees' },
  { slug: 'attendance.read', name: 'View Attendance', module: 'attendance' },
  { slug: 'attendance.create', name: 'Manage Attendance', module: 'attendance' },
  { slug: 'attendance.approve', name: 'Approve Attendance', module: 'attendance' },
  { slug: 'leave.read', name: 'View Leave', module: 'leave' },
  { slug: 'leave.create', name: 'Apply Leave', module: 'leave' },
  { slug: 'leave.approve', name: 'Approve Leave', module: 'leave' },
  { slug: 'dashboard.read', name: 'View Dashboard', module: 'dashboard' },
  { slug: 'reports.read', name: 'View Reports', module: 'reports' },
  { slug: 'settings.read', name: 'View Settings', module: 'settings' },
  { slug: 'settings.update', name: 'Update Settings', module: 'settings' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: PERMISSIONS.map((p) => p.slug),
  admin: PERMISSIONS.map((p) => p.slug).filter((s) => !s.startsWith('company.create')),
  hr: [
    'company.read', 'masters.read', 'masters.create', 'masters.update', 'masters.delete',
    'employees.read', 'employees.create', 'employees.update', 'employees.delete',
    'attendance.read', 'attendance.create', 'attendance.approve',
    'leave.read', 'leave.create', 'leave.approve',
    'dashboard.read', 'reports.read', 'settings.read', 'settings.update',
  ],
  manager: [
    'company.read', 'masters.read', 'employees.read',
    'attendance.read', 'attendance.create', 'attendance.approve',
    'leave.read', 'leave.approve', 'dashboard.read', 'reports.read',
  ],
  employee: [
    'attendance.read', 'attendance.create', 'leave.read', 'leave.create', 'dashboard.read',
  ],
};

async function main() {
  console.log('🌱 Seeding database...');

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  const company = await prisma.company.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Corp',
      slug: 'demo-corp',
      email: 'info@democorp.com',
      phone: '+91 9876543210',
      timezone: 'Asia/Kolkata',
      settings: { create: {} },
    },
  });

  const roles: Record<string, string> = {};
  for (const [slug, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const existing = await prisma.role.findFirst({
      where: { slug, companyId: company.id },
    });
    const role = existing ?? await prisma.role.create({
      data: {
        name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        slug,
        companyId: company.id,
        isSystem: true,
      },
    });
    roles[slug] = role.id;

    for (const permSlug of perms) {
      const perm = await prisma.permission.findUnique({ where: { slug: permSlug } });
      if (perm) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
          update: {},
          create: { roleId: role.id, permissionId: perm.id },
        });
      }
    }
  }

  const dept = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'ENG' } },
    update: {},
    create: { companyId: company.id, name: 'Engineering', code: 'ENG' },
  });

  const designation = await prisma.designation.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SE' } },
    update: {},
    create: { companyId: company.id, name: 'Software Engineer', code: 'SE', level: 3 },
  });

  const leaveType = await prisma.leaveType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'CL' } },
    update: { daysPerYear: 12, isCarryForward: true, isPaid: true },
    create: { companyId: company.id, name: 'Casual Leave', code: 'CL', daysPerYear: 12, isCarryForward: true, isPaid: true },
  });

  await prisma.leavePolicy.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      name: 'Default Leave Policy',
      annualLeaveDays: 12,
      monthlyAccrualDays: 1,
      carryForwardEnabled: true,
      accrualFromJoinDate: true,
      isActive: true,
    },
  });

  await prisma.officeLocation.upsert({
    where: { id: 'seed-hq-office' },
    update: {},
    create: {
      id: 'seed-hq-office',
      companyId: company.id,
      name: 'HQ Office — Mumbai',
      address: 'Bandra Kurla Complex, Mumbai',
      latitude: 19.0596,
      longitude: 72.8656,
      radius: 500,
      isActive: true,
    },
  });

  await prisma.attendancePolicy.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      name: 'Default Attendance Policy',
      shiftStartTime: '09:00',
      graceMinutes: 15,
      lateAfterTime: '09:30',
      lateOccurrenceLimit: 3,
      evaluationPeriod: 'MONTHLY',
      penaltyType: 'HALF_DAY',
      isActive: true,
    },
  });

  const users = [
    { email: 'admin@cronos.com', password: 'Admin@123', firstName: 'Admin', lastName: 'User', role: 'admin', code: 'EMP001' },
    { email: 'hr@cronos.com', password: 'Hr@12345', firstName: 'HR', lastName: 'Manager', role: 'hr', code: 'EMP002' },
    { email: 'employee@cronos.com', password: 'Employee@123', firstName: 'John', lastName: 'Doe', role: 'employee', code: 'EMP003' },
  ];

  for (const u of users) {
    const employee = await prisma.employee.upsert({
      where: { companyId_email: { companyId: company.id, email: u.email } },
      update: {},
      create: {
        companyId: company.id,
        employeeCode: u.code,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        departmentId: dept.id,
        designationId: designation.id,
        status: 'active',
        dateOfJoining: new Date('2024-01-01'),
      },
    });

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: await hashPassword(u.password),
        firstName: u.firstName,
        lastName: u.lastName,
        companyId: company.id,
        employeeId: employee.id,
        isActive: true,
        isVerified: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles[u.role] } },
      update: {},
      create: { userId: user.id, roleId: roles[u.role] },
    });

    await prisma.leaveBalance.upsert({
      where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: leaveType.id, year: 2026 } },
      update: {},
      create: { employeeId: employee.id, leaveTypeId: leaveType.id, year: 2026, allocated: 12, balance: 12 },
    });

    console.log(`  ✓ ${u.email} / ${u.password}`);
  }

  console.log('✅ Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
