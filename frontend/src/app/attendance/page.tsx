'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { isStaffUser } from '@/lib/auth-roles';
import { formatPersonName } from '@/lib/format-name';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function statusClass(status: string) {
  switch (status) {
    case 'late':
      return 'bg-amber-100 text-amber-800';
    case 'half_day':
      return 'bg-orange-100 text-orange-800';
    case 'absent':
      return 'bg-red-100 text-red-800';
    case 'on_leave':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-green-100 text-green-800';
  }
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const staff = isStaffUser(user);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () =>
      apiFetch<{
        items: Array<{
          id: string;
          date: string;
          status: string;
          checkIn: string | null;
          checkOut: string | null;
          lateMinutes: number | null;
          lateCount: number | null;
          employee: { firstName: string; lastName: string };
        }>;
      }>('/api/v1/attendance'),
  });

  const checkIn = async () => {
    try {
      const result = await apiFetch<{
        attendance: { status: string; lateCount: number | null };
        evaluation: { policyTriggered: boolean; lateCount: number };
      }>('/api/v1/attendance/check-in', { method: 'POST', body: JSON.stringify({}) });

      const { attendance, evaluation } = result;
      if (evaluation.policyTriggered) {
        setMessage(`Checked in — policy triggered. Status: ${statusLabel(attendance.status)} (late #${evaluation.lateCount})`);
      } else if (attendance.status === 'late') {
        setMessage(`Checked in late (#${evaluation.lateCount} this period)`);
      } else {
        setMessage('Checked in successfully');
      }
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  const checkOut = async () => {
    try {
      await apiFetch('/api/v1/attendance/check-out', { method: 'POST', body: JSON.stringify({}) });
      setMessage('Checked out successfully');
      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div>
      <PageHeader
        title={staff ? 'Attendance' : 'My Attendance'}
        description={staff ? 'Company attendance records' : 'Check in, check out, and view your history'}
        actions={
          <div className="flex gap-2">
            <Button onClick={checkIn}>Check In</Button>
            <Button variant="outline" onClick={checkOut}>Check Out</Button>
          </div>
        }
      />
      {message && <p className="mb-4 text-sm text-primary">{message}</p>}
      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              {staff && <th className="p-3">Employee</th>}
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Late #</th>
              <th className="p-3">Check In</th>
              <th className="p-3">Check Out</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={staff ? 6 : 5} className="p-6 text-center">Loading...</td></tr>
            ) : (
              data?.items.map((a) => (
                <tr key={a.id} className="border-b">
                  {staff && (
                    <td className="p-3">{formatPersonName(a.employee.firstName, a.employee.lastName)}</td>
                  )}
                  <td className="p-3">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClass(a.status)}`}>
                      {statusLabel(a.status)}
                    </span>
                  </td>
                  <td className="p-3">{a.lateCount ?? '—'}</td>
                  <td className="p-3">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                  <td className="p-3">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
