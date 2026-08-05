import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import {
  syncEmployeeLeaveBalance,
  upsertDepartmentLeavePolicy,
} from '../src/services/leave.service';
import { upsertDepartmentAttendancePolicy } from '../src/services/attendance-policy.service';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Gyro@123';
const HR_PASSWORD = 'Hr@12345';

const DUMMY_EMAILS = [
  'rahul.sharma@gyroitsolutions.com',
  'priya.mehta@gyroitsolutions.com',
  'employee@cronos.com',
  'hr@cronos.com',
];

async function fixPlaceholderNames(companyId: string) {
  const bad = await prisma.employee.findMany({
    where: { companyId, lastName: '.' },
  });
  for (const emp of bad) {
    await prisma.employee.update({ where: { id: emp.id }, data: { lastName: '' } });
    await prisma.user.updateMany({
      where: { employeeId: emp.id },
      data: { lastName: '' },
    });
  }
  if (bad.length) console.log(`  ✓ Fixed ${bad.length} name(s) with trailing "."`);
}

const GYRO_IT_EMPLOYEES = [
  { email: 'girilal@gyroitsolutions.com', firstName: 'Girilal', lastName: '' },
  { email: 'rahul@gyroitsolutions.com', firstName: 'Rahul', lastName: '' },
  { email: 'shanmukhapriya@gyroitsolutions.com', firstName: 'Shanmukha', lastName: 'Priya' },
  { email: 'tejravi@gyroitsolutions.com', firstName: 'Tejravi', lastName: '', role: 'hr' as const },
  { email: 'pratheek.palangappa@gyroitsolutions.com', firstName: 'Pratheek', lastName: 'Palangappa' },
  { email: 'pruthvi.g@gyroitsolutions.com', firstName: 'Pruthvi', lastName: 'G' },
  { email: 'niyam.r@gyroitsolutions.com', firstName: 'Niyam', lastName: 'R' },
  { email: 'syed.junaid@gyroitsolutions.com', firstName: 'Syed', lastName: 'Junaid' },
  { email: 'suhas@gyroitsolutions.com', firstName: 'Suhas', lastName: '' },
  { email: 'balakrishna@gyroitsolutions.com', firstName: 'Balakrishna', lastName: '' },
];

const TUI_EMPLOYEES = [
  { email: 'rashmi@gyroitsolutions.com', firstName: 'Rashmi', lastName: 'Patil' },
  { email: 'spoorthi@gyroitsolutions.com', firstName: 'Spoorthi', lastName: 'M Kamath' },
  { email: 'bhavana.p@gyroitsolutions.com', firstName: 'Bhavana', lastName: 'Prasanna' },
  { email: 'sujithagowtham@gyroitsolutions.com', firstName: 'Sujitha', lastName: 'G' },
  { email: 'rakesh.p@gyroitsolutions.com', firstName: 'Rakesh', lastName: 'Patil' },
  { email: 'abdulali.r@gyroitsolutions.com', firstName: 'Abdul Ali', lastName: 'S' },
];

async function removeDummyData(companyId: string) {
  console.log('🧹 Removing demo / dummy employees...');

  for (const email of DUMMY_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    const employee = await prisma.employee.findFirst({ where: { companyId, email } });

    if (employee) {
      await prisma.leaveRequest.deleteMany({ where: { employeeId: employee.id } });
      await prisma.leaveBalance.deleteMany({ where: { employeeId: employee.id } });
      await prisma.attendance.deleteMany({ where: { employeeId: employee.id } });
      await prisma.employee.delete({ where: { id: employee.id } });
      console.log(`  ✗ Removed employee ${email}`);
    }

    if (user) {
      await prisma.userRole.deleteMany({ where: { userId: user.id } });
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`  ✗ Removed user ${email}`);
    }
  }

  await prisma.notification.deleteMany({
    where: {
      companyId,
      type: { in: ['attendance_policy', 'leave_application'] },
    },
  });
}

type EmployeeSeed = {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'hr';
};

async function upsertEmployee(params: {
  companyId: string;
  person: EmployeeSeed;
  departmentId: string;
  designationId: string;
  defaultShiftId: string;
  employeeCode: string;
  employeeRoleId?: string;
  hrRoleId?: string;
  leaveTypeId: string;
  referenceDate: Date;
  leaveNote: string;
}) {
  const {
    companyId,
    person,
    departmentId,
    designationId,
    defaultShiftId,
    employeeCode,
    employeeRoleId,
    hrRoleId,
    leaveTypeId,
    referenceDate,
    leaveNote,
  } = params;

  const password = person.role === 'hr' ? HR_PASSWORD : DEFAULT_PASSWORD;

  const employee = await prisma.employee.upsert({
    where: { companyId_email: { companyId, email: person.email } },
    update: {
      firstName: person.firstName,
      lastName: person.lastName,
      departmentId,
      designationId,
      defaultShiftId,
      employeeCode,
      status: 'active',
    },
    create: {
      companyId,
      employeeCode,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      departmentId,
      designationId,
      defaultShiftId,
      status: 'active',
      dateOfJoining: new Date('2025-01-01'),
    },
  });

  const existingUser = await prisma.user.findUnique({ where: { email: person.email } });

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          employeeId: employee.id,
          companyId,
          firstName: person.firstName,
          lastName: person.lastName,
        },
      })
    : await prisma.user.create({
        data: {
          email: person.email,
          passwordHash: await hashPassword(password),
          firstName: person.firstName,
          lastName: person.lastName,
          companyId,
          employeeId: employee.id,
          isActive: true,
          isVerified: true,
        },
      });

  const roleId = person.role === 'hr' ? hrRoleId : employeeRoleId;
  if (roleId) {
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId } });
  }

  const balance = await syncEmployeeLeaveBalance(companyId, employee.id, leaveTypeId, referenceDate);

  console.log(
    `  ✓ ${person.firstName} ${person.lastName} — ${person.email} / ${password} (${leaveNote}, balance: ${balance.balance})`
  );
}

async function main() {
  console.log('🌱 Seeding Gyro IT Solutions & TUI departments...');

  const company = await prisma.company.findUnique({ where: { slug: 'demo-corp' } });
  if (!company) throw new Error('Run npm run db:seed first');

  await removeDummyData(company.id);
  await fixPlaceholderNames(company.id);

  const gyroDept = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GYRO' } },
    update: { name: 'Gyro IT Solutions', isActive: true },
    create: {
      companyId: company.id,
      name: 'Gyro IT Solutions',
      code: 'GYRO',
      description: 'Gyro IT Solutions — standard day shift with attendance policy',
    },
  });

  const tuiDept = await prisma.department.upsert({
    where: { companyId_code: { companyId: company.id, code: 'TUI' } },
    update: { name: 'TUI', isActive: true },
    create: {
      companyId: company.id,
      name: 'TUI',
      code: 'TUI',
      description: 'TUI department — afternoon shift (1 PM – 10 PM), no late penalties',
    },
  });

  const gyroDesignation = await prisma.designation.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GYRO-EMP' } },
    update: { name: 'Gyro IT Employee' },
    create: {
      companyId: company.id,
      name: 'Gyro IT Employee',
      code: 'GYRO-EMP',
      level: 2,
    },
  });

  const tuiDesignation = await prisma.designation.upsert({
    where: { companyId_code: { companyId: company.id, code: 'TUI-ASSOC' } },
    update: { name: 'TUI Associate' },
    create: {
      companyId: company.id,
      name: 'TUI Associate',
      code: 'TUI-ASSOC',
      level: 2,
    },
  });

  const gyroShift = await prisma.shiftType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'GYRO-0900' } },
    update: {
      name: 'Day Shift (9 AM – 6 PM)',
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: 'Day Shift (9 AM – 6 PM)',
      code: 'GYRO-0900',
      startTime: '09:00',
      endTime: '18:00',
      isActive: true,
    },
  });

  const tuiShift = await prisma.shiftType.upsert({
    where: { companyId_code: { companyId: company.id, code: 'TUI-1300' } },
    update: {
      name: 'TUI Shift (1 PM – 10 PM)',
      startTime: '13:00',
      endTime: '22:00',
      isActive: true,
    },
    create: {
      companyId: company.id,
      name: 'TUI Shift (1 PM – 10 PM)',
      code: 'TUI-1300',
      startTime: '13:00',
      endTime: '22:00',
      isActive: true,
    },
  });

  await upsertDepartmentAttendancePolicy(company.id, gyroDept.id, {
    name: 'Gyro IT Attendance Policy',
    shiftStartTime: '09:00',
    graceMinutes: 15,
    lateAfterTime: '09:30',
    lateOccurrenceLimit: 3,
    evaluationPeriod: 'MONTHLY',
    penaltyType: 'HALF_DAY',
    penaltiesEnabled: true,
    isActive: true,
  });

  await upsertDepartmentAttendancePolicy(company.id, tuiDept.id, {
    name: 'TUI Attendance (no penalties)',
    shiftStartTime: '13:00',
    graceMinutes: 0,
    lateAfterTime: '22:00',
    lateOccurrenceLimit: 999,
    evaluationPeriod: 'MONTHLY',
    penaltyType: 'WARNING',
    penaltiesEnabled: false,
    isActive: true,
  });

  await upsertDepartmentLeavePolicy(company.id, tuiDept.id, {
    name: 'TUI Leave Policy',
    annualLeaveDays: 21,
    monthlyAccrualDays: 1.75,
    carryForwardEnabled: true,
    accrualFromJoinDate: true,
    isActive: true,
  });

  const leaveType = await prisma.leaveType.findFirst({
    where: { companyId: company.id, code: 'CL' },
  });
  if (!leaveType) throw new Error('Casual Leave type not found');

  const employeeRole = await prisma.role.findFirst({
    where: { companyId: company.id, slug: 'employee' },
  });
  const hrRole = await prisma.role.findFirst({
    where: { companyId: company.id, slug: 'hr' },
  });

  const referenceDate = new Date('2026-08-05');

  console.log('\n📁 Gyro IT Solutions (standard shift + late policy, 1 leave/month):');
  let gyroCode = 0;
  for (const person of GYRO_IT_EMPLOYEES) {
    gyroCode += 1;
    await upsertEmployee({
      companyId: company.id,
      person,
      departmentId: gyroDept.id,
      designationId: gyroDesignation.id,
      defaultShiftId: gyroShift.id,
      employeeCode: `GYRO${String(gyroCode).padStart(3, '0')}`,
      employeeRoleId: employeeRole?.id,
      hrRoleId: hrRole?.id,
      leaveTypeId: leaveType.id,
      referenceDate,
      leaveNote: '1 day/month',
    });
  }

  console.log('\n📁 TUI (1 PM–10 PM shift, no late penalties, 1.75 leave/month):');
  let tuiCode = 0;
  for (const person of TUI_EMPLOYEES) {
    tuiCode += 1;
    await upsertEmployee({
      companyId: company.id,
      person,
      departmentId: tuiDept.id,
      designationId: tuiDesignation.id,
      defaultShiftId: tuiShift.id,
      employeeCode: `TUI${String(tuiCode).padStart(3, '0')}`,
      employeeRoleId: employeeRole?.id,
      hrRoleId: hrRole?.id,
      leaveTypeId: leaveType.id,
      referenceDate,
      leaveNote: '1.75 days/month',
    });
  }

  console.log('\n✅ Gyro IT & TUI employee seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
