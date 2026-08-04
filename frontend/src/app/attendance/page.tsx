'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function AttendancePage() {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => apiFetch<{ items: Array<{ id: string; date: string; status: string; checkIn: string | null; checkOut: string | null; employee: { firstName: string; lastName: string } }> }>('/api/v1/attendance'),
  });

  const checkIn = async () => {
    try {
      await apiFetch('/api/v1/attendance/check-in', { method: 'POST', body: JSON.stringify({}) });
      setMessage('Checked in successfully');
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
        title="Attendance"
        description="Check in, check out, and view attendance history"
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
              <th className="p-3">Employee</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Check In</th>
              <th className="p-3">Check Out</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center">Loading...</td></tr>
            ) : (
              data?.items.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-3">{a.employee.firstName} {a.employee.lastName}</td>
                  <td className="p-3">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{a.status}</td>
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
