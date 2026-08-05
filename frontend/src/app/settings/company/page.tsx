'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';

export default function CompanySettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => apiFetch<{ name: string; email: string | null; phone: string | null; timezone: string; branches: Array<{ id: string; name: string; city: string | null }> }>('/api/v1/company/current'),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <PageHeader title="Company Profile" description="Manage company profile and branches" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Company Profile</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div><dt className="text-muted-foreground">Name</dt><dd>{data?.name}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{data?.email ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd>{data?.phone ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Timezone</dt><dd>{data?.timezone}</dd></div>
          </dl>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-semibold">Branches</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {data?.branches?.length ? data.branches.map((b) => (
              <li key={b.id} className="rounded border p-3">{b.name} {b.city && `· ${b.city}`}</li>
            )) : <li className="text-muted-foreground">No branches yet</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
