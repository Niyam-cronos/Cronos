'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    try {
      await loginUser(data.email, data.password);
      await refresh();
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="text-center">
          <Clock className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-2 text-2xl font-bold">Sign in to Cronos</h1>
          <p className="text-sm text-muted-foreground">Workforce Attendance & HRMS</p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" type="email" placeholder="admin@cronos.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Demo: admin@cronos.com / Admin@123
        </p>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}
