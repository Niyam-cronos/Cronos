'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

const schema = z.object({ email: z.string().email() });

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await apiFetch<{ message: string; token?: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setMessage(res.message);
      if (res.token) setDevToken(res.token);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8">
        <h1 className="text-xl font-bold">Forgot Password</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input type="email" placeholder="Email" {...register('email')} />
          <Button type="submit" className="w-full" disabled={isSubmitting}>Send Reset Link</Button>
        </form>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
        {devToken && (
          <p className="text-xs text-muted-foreground">
            Dev token: <Link href={`/reset-password?token=${devToken}`} className="text-primary">{devToken.slice(0, 16)}...</Link>
          </p>
        )}
        <Link href="/login" className="text-sm text-primary">Back to login</Link>
      </div>
    </div>
  );
}
