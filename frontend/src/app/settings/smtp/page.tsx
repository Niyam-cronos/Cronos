'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  useTls: boolean;
  status: string;
  passwordConfigured: boolean;
}

const GMAIL_DEFAULTS = {
  host: 'smtp.gmail.com',
  port: 587,
  username: 'tejravi@gyroitsolutions.com',
  fromEmail: 'tejravi@gyroitsolutions.com',
  fromName: 'Gyroit HR',
  replyTo: 'tejravi@gyroitsolutions.com',
  useTls: true,
  status: 'active' as const,
};

export default function SmtpSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    host: GMAIL_DEFAULTS.host,
    port: String(GMAIL_DEFAULTS.port),
    username: GMAIL_DEFAULTS.username,
    password: '',
    fromEmail: GMAIL_DEFAULTS.fromEmail,
    fromName: GMAIL_DEFAULTS.fromName,
    replyTo: GMAIL_DEFAULTS.replyTo,
    useTls: GMAIL_DEFAULTS.useTls,
    status: GMAIL_DEFAULTS.status,
  });
  const [testEmail, setTestEmail] = useState(GMAIL_DEFAULTS.username);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: () => apiFetch<SmtpSettings | null>('/api/v1/settings/smtp'),
  });

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      host: data.host,
      port: String(data.port),
      username: data.username,
      fromEmail: data.fromEmail,
      fromName: data.fromName ?? GMAIL_DEFAULTS.fromName,
      replyTo: data.replyTo ?? GMAIL_DEFAULTS.replyTo,
      useTls: data.useTls,
      status: data.status,
      password: '',
    }));
    setTestEmail(data.replyTo ?? data.username);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<SmtpSettings>('/api/v1/settings/smtp', {
        method: 'PUT',
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          username: form.username,
          password: form.password || undefined,
          fromEmail: form.fromEmail,
          fromName: form.fromName,
          replyTo: form.replyTo,
          useTls: form.useTls,
          status: form.status,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      setMessage({ type: 'success', text: 'SMTP settings saved.' });
      setForm((prev) => ({ ...prev, password: '' }));
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ sentTo: string }>('/api/v1/settings/smtp/test', {
        method: 'POST',
        body: JSON.stringify({ testEmail }),
      }),
    onSuccess: (result) => {
      setMessage({
        type: 'success',
        text: `SMTP configured successfully. Test email sent to ${result.sentTo}.`,
      });
    },
    onError: (err: Error) => setMessage({ type: 'error', text: err.message }),
  });

  if (isLoading) return <p>Loading SMTP settings...</p>;

  return (
    <div>
      <PageHeader
        title="SMTP Configuration"
        description="Connect Google Workspace to send password resets, leave updates, and welcome emails."
      />

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Use a Google <strong>App Password</strong> (not your normal Gmail password). Enable 2-Step Verification, then create an App Password at{' '}
        <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
          myaccount.google.com/apppasswords
        </a>
        .
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">SMTP Host</label>
            <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">SMTP Port</label>
            <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input
            type="email"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password (App Password)</label>
          <Input
            type="password"
            placeholder={data?.passwordConfigured ? '••••••••••••••••' : 'abcd efgh ijkl mnop'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {data?.passwordConfigured && (
            <p className="text-xs text-muted-foreground">Leave blank to keep the existing app password.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">From Name</label>
            <Input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">From Email</label>
            <Input
              type="email"
              value={form.fromEmail}
              onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Reply To</label>
          <Input
            type="email"
            value={form.replyTo}
            onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>

      <div className="mt-6 max-w-2xl space-y-3 rounded-lg border bg-card p-6">
        <h3 className="font-semibold">Test SMTP</h3>
        <p className="text-sm text-muted-foreground">
          Save your settings first, then send a test email to verify Google Workspace is connected.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1 space-y-2">
            <label className="text-sm font-medium">Send test email to</label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={testMutation.isPending}
            onClick={() => {
              setMessage(null);
              testMutation.mutate();
            }}
          >
            {testMutation.isPending ? 'Sending...' : 'Test SMTP'}
          </Button>
        </div>
      </div>
    </div>
  );
}
