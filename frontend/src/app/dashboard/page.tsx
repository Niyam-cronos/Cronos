'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingLeaves: number;
  pendingCorrections: number;
  departments: number;
  role: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/v1/dashboard'),
  });

  const cards = [
    { label: 'Employees', value: data?.totalEmployees },
    { label: 'Present Today', value: data?.presentToday },
    { label: 'On Leave', value: data?.onLeaveToday },
    { label: 'Pending Leaves', value: data?.pendingLeaves },
    { label: 'Pending Corrections', value: data?.pendingCorrections },
    { label: 'Departments', value: data?.departments },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.firstName}`}
        description={`${data?.role ?? user?.roles[0] ?? 'employee'} dashboard`}
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
