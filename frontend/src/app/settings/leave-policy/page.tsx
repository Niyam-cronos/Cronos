'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface LeavePolicy {
  name: string;
  annualLeaveDays: number;
  monthlyAccrualDays: number;
  carryForwardEnabled: boolean;
  maxCarryForwardDays: number | null;
  accrualFromJoinDate: boolean;
  isActive: boolean;
}

const DEFAULTS: LeavePolicy = {
  name: 'Default Leave Policy',
  annualLeaveDays: 12,
  monthlyAccrualDays: 1,
  carryForwardEnabled: true,
  maxCarryForwardDays: null,
  accrualFromJoinDate: true,
  isActive: true,
};

export default function LeavePolicyPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leave-policy'],
    queryFn: () => apiFetch<LeavePolicy | null>('/api/v1/settings/leave-policy'),
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data, maxCarryForwardDays: data.maxCarryForwardDays ?? null });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<LeavePolicy>('/api/v1/settings/leave-policy', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          maxCarryForwardDays: form.maxCarryForwardDays || null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-policy'] });
      setMessage({ type: 'success', text: 'Leave policy saved.' });
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  });

  if (isLoading) return <p>Loading leave policy...</p>;

  return (
    <div>
      <PageHeader
        title="Leave Policy"
        description="Configure annual leave accrual, monthly credits, carry-forward, and paid vs loss-of-pay rules."
      />

      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Example: <strong>{form.monthlyAccrualDays}</strong> leave/month ({form.annualLeaveDays}/year).
        Unused leaves carry forward. If balance is <strong>2</strong> and employee takes <strong>3</strong> days →
        <strong> 2 paid</strong> + <strong>1 loss of pay</strong>.
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border p-4 text-sm ${
            message.type === 'success' ? 'border-green-200 bg-green-50 text-green-900' : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {message.text}
        </div>
      )}

      <form
        className="max-w-2xl space-y-4 rounded-lg border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          saveMutation.mutate();
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Policy Name</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Annual Leave Days</label>
            <Input type="number" min={1} value={form.annualLeaveDays} onChange={(e) => setForm({ ...form, annualLeaveDays: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Accrual (days/month)</label>
            <Input type="number" min={0.5} step={0.5} value={form.monthlyAccrualDays} onChange={(e) => setForm({ ...form, monthlyAccrualDays: Number(e.target.value) })} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Max Carry Forward Days (optional)</label>
          <Input
            type="number"
            min={1}
            placeholder="No limit"
            value={form.maxCarryForwardDays ?? ''}
            onChange={(e) => setForm({ ...form, maxCarryForwardDays: e.target.value ? Number(e.target.value) : null })}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.carryForwardEnabled} onChange={(e) => setForm({ ...form, carryForwardEnabled: e.target.checked })} />
          Enable carry forward of unused leaves
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.accrualFromJoinDate} onChange={(e) => setForm({ ...form, accrualFromJoinDate: e.target.checked })} />
          Accrue from employee join date (not full year upfront)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Policy active
        </label>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Policy'}
        </Button>
      </form>
    </div>
  );
}
