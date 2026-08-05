import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { notifyAttendancePolicyTriggered } from '../src/services/notification.service';

const prisma = new PrismaClient();
const HR_EMAIL = 'tejravi@gyroitsolutions.com';

function dateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function istCheckIn(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

async function main() {
  console.log('🌱 Seeding attendance policy demo data...');

  const company = await prisma.company.findUnique({ where: { slug: 'demo-corp' } });
  if (!company) {
    throw new Error('Demo company not found. Run npm run db:seed first.');
  }

  const dept = await prisma.department.findFirst({ where: { companyId: company.id, code: 'ENG' } });
  const designation = await prisma.designation.findFirst({ where: { companyId: company.id, code: 'SE' } });
  const employeeRole = await prisma.role.findFirst({ where: { companyId: company.id, slug: 'employee' } });

  const existingPolicy = await prisma.attendancePolicy.findFirst({
    where: { companyId: company.id, departmentId: null },
  });
  if (existingPolicy) {
    await prisma.attendancePolicy.update({
      where: { id: existingPolicy.id },
      data: {
        shiftStartTime: '09:00',
        graceMinutes: 15,
        lateAfterTime: '09:30',
        lateOccurrenceLimit: 3,
        evaluationPeriod: 'MONTHLY',
        penaltyType: 'HALF_DAY',
        isActive: true,
      },
    });
  } else {
    await prisma.attendancePolicy.create({
      data: {
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
  }

  const rahul = await prisma.employee.upsert({
    where: { companyId_email: { companyId: company.id, email: 'rahul.sharma@gyroitsolutions.com' } },
    update: { firstName: 'Rahul', lastName: 'Sharma', employeeCode: 'EMP004' },
    create: {
      companyId: company.id,
      employeeCode: 'EMP004',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@gyroitsolutions.com',
      departmentId: dept?.id,
      designationId: designation?.id,
      status: 'active',
      dateOfJoining: new Date('2025-06-01'),
    },
  });

  const rahulUser = await prisma.user.upsert({
    where: { email: 'rahul.sharma@gyroitsolutions.com' },
    update: { employeeId: rahul.id, companyId: company.id },
    create: {
      email: 'rahul.sharma@gyroitsolutions.com',
      passwordHash: await hashPassword('Rahul@123'),
      firstName: 'Rahul',
      lastName: 'Sharma',
      companyId: company.id,
      employeeId: rahul.id,
      isActive: true,
      isVerified: true,
    },
  });

  if (employeeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: rahulUser.id, roleId: employeeRole.id } },
      update: {},
      create: { userId: rahulUser.id, roleId: employeeRole.id },
    });
  }

  const hrUser = await prisma.user.findFirst({
    where: {
      companyId: company.id,
      userRoles: { some: { role: { slug: 'hr' } } },
    },
  });
  const hrEmployee = await prisma.employee.findFirst({
    where: { companyId: company.id, employeeCode: 'EMP002' },
  });
  if (hrUser) {
    await prisma.user.update({ where: { id: hrUser.id }, data: { email: HR_EMAIL } });
  }
  if (hrEmployee) {
    await prisma.employee.update({ where: { id: hrEmployee.id }, data: { email: HR_EMAIL } });
  }

  const john = await prisma.employee.findFirst({
    where: { companyId: company.id, email: 'employee@cronos.com' },
  });

  const demoRecords = [
    {
      employeeId: rahul.id,
      date: '2026-08-01',
      checkIn: '09:35',
      status: 'late',
      lateMinutes: 35,
      lateCount: 1,
      notes: 'Late #1 this month',
    },
    {
      employeeId: rahul.id,
      date: '2026-08-08',
      checkIn: '09:42',
      status: 'late',
      lateMinutes: 42,
      lateCount: 2,
      notes: 'Late #2 this month',
    },
    {
      employeeId: rahul.id,
      date: '2026-08-18',
      checkIn: '09:38',
      status: 'half_day',
      lateMinutes: 38,
      lateCount: 3,
      notes: 'Late #3 — policy penalty applied (Half Day)',
    },
    {
      employeeId: rahul.id,
      date: '2026-08-05',
      checkIn: '09:10',
      status: 'present',
      lateMinutes: null,
      lateCount: null,
      notes: 'On time',
    },
  ];

  if (john) {
    demoRecords.push({
      employeeId: john.id,
      date: '2026-08-05',
      checkIn: '09:05',
      status: 'present',
      lateMinutes: null,
      lateCount: null,
      notes: 'On time',
    });
    demoRecords.push({
      employeeId: john.id,
      date: '2026-08-04',
      checkIn: '09:15',
      status: 'present',
      lateMinutes: null,
      lateCount: null,
      notes: 'On time',
    });
  }

  for (const record of demoRecords) {
    const date = dateOnly(record.date);
    const checkIn = istCheckIn(record.date, record.checkIn);
    const checkOut = new Date(checkIn.getTime() + 8 * 60 * 60 * 1000);

    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: record.employeeId, date } },
      update: {
        status: record.status,
        checkIn,
        checkOut,
        totalHours: 8,
        lateMinutes: record.lateMinutes,
        lateCount: record.lateCount,
        notes: record.notes,
      },
      create: {
        companyId: company.id,
        employeeId: record.employeeId,
        date,
        status: record.status,
        checkIn,
        checkOut,
        totalHours: 8,
        lateMinutes: record.lateMinutes,
        lateCount: record.lateCount,
        notes: record.notes,
      },
    });
  }

  await prisma.notification.deleteMany({
    where: { companyId: company.id, type: 'attendance_policy' },
  });

  await notifyAttendancePolicyTriggered({
    companyId: company.id,
    employeeId: rahul.id,
    employeeName: 'Rahul Sharma',
    lateCount: 3,
    penaltyLabel: 'Half Day',
    periodLabel: 'Monthly',
  });

  const smtp = await prisma.smtpSetting.findUnique({ where: { companyId: company.id } });
  console.log('  ✓ Rahul Sharma — rahul.sharma@gyroitsolutions.com / Rahul@123');
  console.log(`  ✓ HR email updated to ${HR_EMAIL} (login: ${HR_EMAIL} / Hr@12345)`);
  console.log('  ✓ Attendance: Aug 1 Late #1, Aug 8 Late #2, Aug 18 Half Day #3');
  console.log('  ✓ Aug 5 present (on time) + John Doe sample records');
  console.log('  ✓ HR + employee notifications created');
  if (smtp?.status === 'active') {
    console.log('  ✓ Policy emails queued to HR + Rahul (check inbox if Redis + backend running)');
  } else {
    console.log('  ⚠ Configure SMTP in Settings → SMTP to receive real emails');
  }
  console.log('✅ Attendance demo seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
