import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import {
  applyLeaveWithPolicy,
  syncEmployeeLeaveBalance,
} from '../src/services/leave.service';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding leave policy demo...');

  const company = await prisma.company.findUnique({ where: { slug: 'demo-corp' } });
  if (!company) throw new Error('Run npm run db:seed first');

  const dept = await prisma.department.findFirst({ where: { companyId: company.id, code: 'ENG' } });
  const designation = await prisma.designation.findFirst({ where: { companyId: company.id, code: 'SE' } });
  const employeeRole = await prisma.role.findFirst({ where: { companyId: company.id, slug: 'employee' } });
  const leaveType = await prisma.leaveType.findFirst({ where: { companyId: company.id, code: 'CL' } });
  if (!leaveType) throw new Error('Casual Leave type not found');

  const existingLeavePolicy = await prisma.leavePolicy.findFirst({
    where: { companyId: company.id, departmentId: null },
  });
  if (existingLeavePolicy) {
    await prisma.leavePolicy.update({
      where: { id: existingLeavePolicy.id },
      data: {
        annualLeaveDays: 12,
        monthlyAccrualDays: 1,
        carryForwardEnabled: true,
        isActive: true,
      },
    });
  } else {
    await prisma.leavePolicy.create({
      data: {
        companyId: company.id,
        name: 'Default Leave Policy',
        annualLeaveDays: 12,
        monthlyAccrualDays: 1,
        carryForwardEnabled: true,
        accrualFromJoinDate: true,
        isActive: true,
      },
    });
  }

  const priya = await prisma.employee.upsert({
    where: { companyId_email: { companyId: company.id, email: 'priya.mehta@gyroitsolutions.com' } },
    update: {
      firstName: 'Priya',
      lastName: 'Mehta',
      employeeCode: 'EMP005',
      dateOfJoining: new Date('2026-07-01'),
    },
    create: {
      companyId: company.id,
      employeeCode: 'EMP005',
      firstName: 'Priya',
      lastName: 'Mehta',
      email: 'priya.mehta@gyroitsolutions.com',
      departmentId: dept?.id,
      designationId: designation?.id,
      status: 'active',
      dateOfJoining: new Date('2026-07-01'),
    },
  });

  const priyaUser = await prisma.user.upsert({
    where: { email: 'priya.mehta@gyroitsolutions.com' },
    update: { employeeId: priya.id, companyId: company.id },
    create: {
      email: 'priya.mehta@gyroitsolutions.com',
      passwordHash: await hashPassword('Priya@123'),
      firstName: 'Priya',
      lastName: 'Mehta',
      companyId: company.id,
      employeeId: priya.id,
      isActive: true,
      isVerified: true,
    },
  });

  if (employeeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: priyaUser.id, roleId: employeeRole.id } },
      update: {},
      create: { userId: priyaUser.id, roleId: employeeRole.id },
    });
  }

  const referenceDate = new Date('2026-08-05');
  const balance = await syncEmployeeLeaveBalance(company.id, priya.id, leaveType.id, referenceDate);

  await prisma.leaveRequest.deleteMany({
    where: { employeeId: priya.id },
  });

  const { leave, split } = await applyLeaveWithPolicy({
    companyId: company.id,
    employeeId: priya.id,
    leaveTypeId: leaveType.id,
    startDate: new Date('2026-08-10'),
    endDate: new Date('2026-08-12'),
    days: 3,
    reason: 'Family function — awaiting HR approval',
  });

  // Leave as PENDING so HR can see Approve / Reject buttons in the app
  const rahul = await prisma.employee.findFirst({
    where: { companyId: company.id, email: 'rahul.sharma@gyroitsolutions.com' },
  });

  if (rahul) {
    await prisma.leaveRequest.deleteMany({ where: { employeeId: rahul.id } });
    await applyLeaveWithPolicy({
      companyId: company.id,
      employeeId: rahul.id,
      leaveTypeId: leaveType.id,
      startDate: new Date('2026-08-20'),
      endDate: new Date('2026-08-21'),
      days: 2,
      reason: 'Personal work — pending HR review',
    });
  }

  const finalBalance = await syncEmployeeLeaveBalance(company.id, priya.id, leaveType.id, referenceDate);
  const pendingLeave = await prisma.leaveRequest.findUnique({ where: { id: leave.id } });

  console.log('  ✓ Priya Mehta — priya.mehta@gyroitsolutions.com / Priya@123');
  console.log(`  ✓ Joined Jul 2026 → accrued balance before leave: ${balance.balance} day(s)`);
  console.log(`  ✓ Priya leave PENDING → Paid: ${split.paidDays}, LOP: ${split.lopDays} (HR: Approve/Reject on Leave page)`);
  console.log(`  ✓ Rahul leave PENDING (if exists)`);
  console.log(`  ✓ Balance available for Priya: ${finalBalance.balance}`);
  console.log('  ✓ HR notified by email on each application (check tejravi@gyroitsolutions.com)');
  console.log('✅ Leave demo seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
