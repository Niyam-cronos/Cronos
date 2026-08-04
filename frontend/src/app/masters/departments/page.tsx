'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';

const masterLinks = [
  { href: '/masters/departments', label: 'Departments' },
  { href: '/masters/designations', label: 'Designations' },
  { href: '/masters/leave-types', label: 'Leave Types' },
  { href: '/masters/shift-types', label: 'Shift Types' },
  { href: '/masters/skills', label: 'Skills' },
];

export default function DepartmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiFetch<{ items: Array<{ id: string; name: string; code: string | null; isActive: boolean }> }>('/api/v1/masters/departments'),
  });

  return (
    <div>
      <PageHeader title="Masters" description="Configure departments, designations, and more" />
      <div className="mb-6 flex flex-wrap gap-2">
        {masterLinks.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            {l.label}
          </Link>
        ))}
      </div>
      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Code</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="p-6 text-center">Loading...</td></tr>
            ) : (
              data?.items.map((d) => (
                <tr key={d.id} className="border-b">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.code ?? '—'}</td>
                  <td className="p-3">{d.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
