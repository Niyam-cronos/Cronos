'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { isStaffUser } from '@/lib/auth-roles';

interface StaffDashboardStats {
  view: 'staff';
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  pendingCorrections: number;
  departments: number;
  role: string;
}

interface EmployeeDashboardStats {
  view: 'employee';
  role: string;
  department: string | null;
  todayStatus: string;
  checkIn: string | null;
  checkOut: string | null;
  leaveBalance: number;
  leaveAllocated: number;
  leaveUsed: number;
  leaveTypeName: string;
  pendingLeaveRequests: number;
}

type DashboardStats = StaffDashboardStats | EmployeeDashboardStats;

function statusLabel(status: string) {
  if (status === 'not_checked_in') return 'Not checked in';
  return status.replace(/_/g, ' ');
}

export default function DashboardPage() {
  const { user } = useAuth();
  const staff = isStaffUser(user);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/v1/dashboard'),
  });

  if (!staff && data?.view === 'employee') {
    const cards = [
      { label: 'Today', value: statusLabel(data.todayStatus) },
      { label: 'Check in', value: data.checkIn ? new Date(data.checkIn).toLocaleTimeString() : '—' },
      { label: 'Check out', value: data.checkOut ? new Date(data.checkOut).toLocaleTimeString() : '—' },
      { label: data.leaveTypeName, value: `${data.leaveBalance} days left` },
      { label: 'Leave used', value: data.leaveUsed },
      { label: 'Pending requests', value: data.pendingLeaveRequests },
    ];

    return (
      <div>
        <PageHeader
          title={`Hello, ${user?.firstName}`}
          description={data.department ? `${data.department} · Employee portal` : 'Employee portal'}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-2xl font-bold capitalize">{isLoading ? '...' : card.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const staffData = data && data.view === 'staff' ? data : null;
  const cards = [
    { label: 'Employees', value: staffData?.totalEmployees },
    { label: 'Present Today', value: staffData?.presentToday },
    { label: 'On Leave', value: staffData?.onLeaveToday },
    { label: 'Pending Leaves', value: staffData?.pendingLeaves },
    { label: 'Pending Corrections', value: staffData?.pendingCorrections },
    { label: 'Departments', value: staffData?.departments },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.firstName}`}
        description={`${staffData?.role ?? user?.roles[0] ?? 'staff'} dashboard`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{isLoading ? '...' : (card.value ?? 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
