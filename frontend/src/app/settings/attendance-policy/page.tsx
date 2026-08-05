'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface AttendancePolicy {
  name: string;
  shiftStartTime: string;
  graceMinutes: number;
  lateAfterTime: string;
  lateOccurrenceLimit: number;
  evaluationPeriod: string;
  penaltyType: string;
  isActive: boolean;
}

const DEFAULTS: AttendancePolicy = {
  name: 'Default Attendance Policy',
  shiftStartTime: '09:00',
  graceMinutes: 15,
  lateAfterTime: '09:30',
  lateOccurrenceLimit: 3,
  evaluationPeriod: 'MONTHLY',
  penaltyType: 'HALF_DAY',
  isActive: true,
};

export default function AttendancePolicyPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULTS);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-policy'],
    queryFn: () => apiFetch<AttendancePolicy | null>('/api/v1/settings/attendance-policy'),
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<AttendancePolicy>('/api/v1/settings/attendance-policy', {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-policy'] });
      setMessage({ type: 'success', text: 'Attendance policy saved.' });
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  });

  const testNotifyMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ employeeName: string }>('/api/v1/settings/attendance-policy/test-notification', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (result) => {
      setMessage({
        type: 'success',
        text: `Test emails queued for HR and ${result.employeeName}. Check tejravi@gyroitsolutions.com inbox.`,
      });
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  });

  if (isLoading) return <p>Loading attendance policy...</p>;

  return (
    <div>
      <PageHeader
        title="Attendance Policies"
        description="Configure late arrival rules, evaluation periods, and penalties without code changes."
      />

      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Example: If an employee checks in after <strong>{form.lateAfterTime}</strong> for{' '}
        <strong>{form.lateOccurrenceLimit}</strong> times in a <strong>{form.evaluationPeriod.toLowerCase()}</strong>{' '}
        period, the {form.lateOccurrenceLimit}rd late check-in is marked as{' '}
        <strong>{form.penaltyType.replace('_', ' ')}</strong>.
      </div>

      {message && (
        <div
          className={`mb-4 rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-red-200 bg-red-50 text-red-900'
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
            <label className="text-sm font-medium">Shift Start</label>
            <Input
              type="time"
              value={form.shiftStartTime}
              onChange={(e) => setForm({ ...form, shiftStartTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Grace Period (minutes)</label>
            <Input
              type="number"
              min={0}
              value={form.graceMinutes}
              onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Late After</label>
            <Input
              type="time"
              value={form.lateAfterTime}
              onChange={(e) => setForm({ ...form, lateAfterTime: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Late Occurrences Allowed</label>
            <Input
              type="number"
              min={1}
              value={form.lateOccurrenceLimit}
              onChange={(e) => setForm({ ...form, lateOccurrenceLimit: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Evaluation Period</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.evaluationPeriod}
              onChange={(e) => setForm({ ...form, evaluationPeriod: e.target.value })}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Penalty</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.penaltyType}
              onChange={(e) => setForm({ ...form, penaltyType: e.target.value })}
            >
              <option value="WARNING">Warning</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="FULL_DAY">Full Day</option>
              <option value="SALARY_DEDUCTION">Salary Deduction</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Policy active
        </label>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Policy'}
        </Button>
      </form>

      <div className="mt-6 max-w-2xl space-y-3 rounded-lg border bg-card p-6">
        <h3 className="font-semibold">Test HR email on 3rd late</h3>
        <p className="text-sm text-muted-foreground">
          Sends a sample &quot;Late Attendance Rule Triggered&quot; email to all HR/admin users and the employee.
          Requires SMTP configured in Settings → SMTP and Redis running.
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={testNotifyMutation.isPending}
          onClick={() => {
            setMessage(null);
            testNotifyMutation.mutate();
          }}
        >
          {testNotifyMutation.isPending ? 'Sending...' : 'Send test policy email to HR'}
        </Button>
      </div>
    </div>
  );
}
