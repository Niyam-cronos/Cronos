'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { formatPersonName } from '@/lib/format-name';

export default function LeavePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');

  const canApprove = user?.permissions.includes('leave.approve');
  const canApply = user?.permissions.includes('leave.create') && !canApprove;

  const { data, isLoading } = useQuery({
    queryKey: ['leave'],
    queryFn: () =>
      apiFetch<{
        items: Array<{
          id: string;
          days: number;
          paidDays: number;
          lopDays: number;
          status: string;
          reason: string;
          startDate: string;
          endDate: string;
          leaveType: { name: string; id: string };
          employee: { firstName: string; lastName: string };
        }>;
      }>('/api/v1/leave'),
  });

  const { data: balances } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: () =>
      apiFetch<
        Array<{
          allocated: number;
          used: number;
          balance: number;
          leaveType: { name: string; id: string };
        }>
      >('/api/v1/leave/balances'),
    enabled: canApply,
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: () =>
      apiFetch<{ items: Array<{ id: string; name: string }> }>('/api/v1/masters/leave-types'),
    enabled: canApply,
  });

  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    days: '1',
    reason: '',
  });

  const applyMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/leave/apply', {
        method: 'POST',
        body: JSON.stringify({
          leaveTypeId: applyForm.leaveTypeId,
          startDate: applyForm.startDate,
          endDate: applyForm.endDate,
          days: Number(applyForm.days),
          reason: applyForm.reason,
        }),
      }),
    onSuccess: () => {
      setMessage('Leave applied. HR has been notified by email.');
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
      setApplyForm({ leaveTypeId: '', startDate: '', endDate: '', days: '1', reason: '' });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      apiFetch(`/api/v1/leave/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, vars) => {
      setMessage(`Leave ${vars.status}. Employee notified by email.`);
      qc.invalidateQueries({ queryKey: ['leave'] });
      qc.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (e: Error) => setMessage(e.message),
  });

  return (
    <div>
      <PageHeader
        title={canApprove ? 'Leave Management' : 'My Leave'}
        description={
          canApprove
            ? 'Review pending requests — approve or reject. Paid vs LOP is calculated automatically.'
            : 'Apply for leave and track your requests.'
        }
      />

      {message && <p className="mb-4 text-sm text-primary">{message}</p>}

      {balances && balances.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {balances.map((b, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{b.leaveType.name}</p>
              <p className="text-2xl font-bold">{b.balance}</p>
              <p className="text-xs text-muted-foreground">
                Accrued: {b.allocated} · Used: {b.used} · Available (incl. carry forward)
              </p>
            </div>
          ))}
        </div>
      )}

      {canApply && leaveTypes?.items && leaveTypes.items.length > 0 && (
        <form
          className="mb-6 max-w-2xl space-y-3 rounded-lg border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage('');
            applyMutation.mutate();
          }}
        >
          <h3 className="font-semibold">Apply for leave</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="h-10 rounded-md border px-3 text-sm"
              value={applyForm.leaveTypeId}
              onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
              required
            >
              <option value="">Leave type</option>
              {leaveTypes.items.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="h-10 rounded-md border px-3 text-sm"
              placeholder="Days"
              value={applyForm.days}
              onChange={(e) => setApplyForm({ ...applyForm, days: e.target.value })}
              required
            />
            <input
              type="date"
              className="h-10 rounded-md border px-3 text-sm"
              value={applyForm.startDate}
              onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
              required
            />
            <input
              type="date"
              className="h-10 rounded-md border px-3 text-sm"
              value={applyForm.endDate}
              onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
              required
            />
          </div>
          <textarea
            className="w-full rounded-md border p-3 text-sm"
            placeholder="Reason"
            rows={2}
            value={applyForm.reason}
            onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
            required
          />
          <Button type="submit" disabled={applyMutation.isPending}>
            {applyMutation.isPending ? 'Submitting...' : 'Submit leave request'}
          </Button>
        </form>
      )}

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {canApprove && <th className="p-3">Employee</th>}
              <th className="p-3">Type</th>
              <th className="p-3">Dates</th>
              <th className="p-3">Days</th>
              <th className="p-3">Paid</th>
              <th className="p-3">LOP</th>
              <th className="p-3">Status</th>
              {canApprove && <th className="p-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={canApprove ? 8 : 7} className="p-6 text-center">Loading...</td></tr>
            ) : (
              data?.items.map((l) => (
                <tr key={l.id} className="border-b">
                  {canApprove && (
                    <td className="p-3">{formatPersonName(l.employee.firstName, l.employee.lastName)}</td>
                  )}
                  <td className="p-3">{l.leaveType.name}</td>
                  <td className="p-3">
                    {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{l.days}</td>
                  <td className="p-3 text-green-700">{l.paidDays}</td>
                  <td className="p-3 text-red-700">{l.lopDays}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                        l.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : l.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  {canApprove && (
                    <td className="p-3">
                      {l.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: l.id, status: 'approved' })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: l.id, status: 'rejected' })}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
