'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function LeavePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['leave'],
    queryFn: () => apiFetch<{ items: Array<{ id: string; days: number; status: string; reason: string; startDate: string; endDate: string; leaveType: { name: string }; employee: { firstName: string; lastName: string } }> }>('/api/v1/leave'),
  });

  return (
    <div>
      <PageHeader
        title="Leave Management"
        description="Apply and manage leave requests"
        actions={
          <Link href="/leave/apply" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Apply Leave
          </Link>
        }
      />
      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Employee</th>
              <th className="p-3">Type</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Days</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr>
            ) : (
              data?.items.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-3">{l.employee.firstName} {l.employee.lastName}</td>
                  <td className="p-3">{l.leaveType.name}</td>
                  <td className="p-3">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</td>
                  <td className="p-3">{l.days}</td>
                  <td className="p-3 capitalize">{l.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
