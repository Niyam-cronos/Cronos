'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Clock, KeyRound, Lock, Mail, User } from 'lucide-react';
import { getLoginMethod, loginUser, requestLoginOtp, verifyLoginOtp } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const passwordSchema = emailSchema.extend({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpSchema = emailSchema.extend({
  otp: z.string().regex(/^\d{4}$/, 'Enter the 4-digit code'),
});

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type OtpForm = z.infer<typeof otpSchema>;

type Step = 'email' | 'password' | 'otp';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function BrandPanel() {
  return (
    <div className="relative hidden min-h-[520px] flex-1 flex-col justify-between overflow-hidden bg-[#4F6BF7] p-10 text-white md:flex">
      <div className="flex items-center gap-2">
        <Clock className="h-7 w-7" strokeWidth={2.5} />
        <span className="text-xl font-bold tracking-[0.2em]">CRONOS</span>
      </div>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 items-center justify-center py-8">
        <div className="absolute left-4 top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-12 right-6 h-32 w-32 rounded-full bg-[#7B93FF]/40 blur-3xl" />

        <div className="relative">
          <div className="absolute -left-10 bottom-6 h-28 w-16 rounded-full bg-white/20" />
          <div className="absolute -right-8 top-10 h-20 w-12 rounded-full bg-white/15" />

          <div className="relative flex h-56 w-56 items-center justify-center rounded-full border-[10px] border-white/90 bg-[#5B7BFA] shadow-2xl">
            <div className="absolute inset-3 rounded-full border border-white/25" />
            <div
              className="absolute left-1/2 top-1/2 h-[72px] w-1 origin-bottom rounded-full bg-white"
              style={{ transform: 'translate(-50%, -100%) rotate(-35deg)' }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-12 w-1 origin-bottom rounded-full bg-white/90"
              style={{ transform: 'translate(-50%, -100%) rotate(75deg)' }}
            />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />

            <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="mb-1 h-9 w-9 rounded-full bg-[#F4B4C4]" />
              <div className="h-11 w-12 rounded-t-3xl bg-[#F08FA8]" />
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm font-light tracking-wide text-white/90">
        Because every second matters.
      </p>
    </div>
  );
}

function FieldShell({
  icon: Icon,
  children,
  error,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 rounded-lg bg-[#F3F4F8] px-4 py-3.5">
        <Icon className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
        {children}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onEmailSubmit = async (data: EmailForm) => {
    setError('');
    setInfo('');
    try {
      const method = await getLoginMethod(data.email);
      setEmail(data.email);

      if (method === 'otp') {
        const result = await requestLoginOtp(data.email);
        setInfo(result.message);
        otpForm.setValue('email', data.email);
        setStep('otp');
      } else {
        passwordForm.setValue('email', data.email);
        setStep('password');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setError('');
    try {
      await loginUser(data.email, data.password);
      await refresh();
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const onOtpSubmit = async (data: OtpForm) => {
    setError('');
    try {
      await verifyLoginOtp(data.email, data.otp);
      await refresh();
      router.push('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    }
  };

  const resendOtp = async () => {
    setError('');
    setInfo('');
    try {
      const result = await requestLoginOtp(email);
      setInfo(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code');
    }
  };

  const goBack = () => {
    setError('');
    setInfo('');
    setStep('email');
  };

  const inputClass =
    'w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-[#9CA3AF] disabled:text-gray-500';

  const submitLabel =
    step === 'email'
      ? emailForm.formState.isSubmitting
        ? 'Checking...'
        : 'Continue'
      : step === 'password'
        ? passwordForm.formState.isSubmitting
          ? 'Signing in...'
          : 'Sign in'
        : otpForm.formState.isSubmitting
          ? 'Verifying...'
          : 'Sign in';

  const isSubmitting =
    step === 'email'
      ? emailForm.formState.isSubmitting
      : step === 'password'
        ? passwordForm.formState.isSubmitting
        : otpForm.formState.isSubmitting;

  const handlePrimarySubmit = () => {
    if (step === 'email') emailForm.handleSubmit(onEmailSubmit)();
    else if (step === 'password') passwordForm.handleSubmit(onPasswordSubmit)();
    else otpForm.handleSubmit(onOtpSubmit)();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EEF1F8] p-4 md:p-8">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(79,107,247,0.15)]">
        <BrandPanel />

        <div className="flex w-full flex-1 flex-col justify-center px-8 py-10 md:px-14 md:py-12">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <Clock className="h-6 w-6 text-[#4F6BF7]" />
            <span className="text-lg font-bold tracking-[0.15em] text-[#4F6BF7]">CRONOS</span>
          </div>

          <div className="mb-8">
            <p className="text-2xl font-bold text-gray-900">{getGreeting()}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Sign in to Cronos</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Enter your access details below to enter the system.
            </p>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          {info && (
            <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{info}</p>
          )}

          <div className="space-y-4">
            {step === 'email' && (
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FieldShell icon={User} error={emailForm.formState.errors.email?.message}>
                  <input
                    type="email"
                    placeholder="Email address"
                    className={inputClass}
                    {...emailForm.register('email')}
                  />
                </FieldShell>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FieldShell icon={Mail}>
                  <input type="email" value={email} disabled className={inputClass} />
                </FieldShell>
                <FieldShell icon={Lock} error={passwordForm.formState.errors.password?.message}>
                  <input
                    type="password"
                    placeholder="Password"
                    className={inputClass}
                    {...passwordForm.register('password')}
                  />
                </FieldShell>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                <FieldShell icon={Mail}>
                  <input type="email" value={email} disabled className={inputClass} />
                </FieldShell>
                <FieldShell icon={KeyRound} error={otpForm.formState.errors.otp?.message}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4-digit code"
                    autoComplete="one-time-code"
                    className={inputClass}
                    {...otpForm.register('otp')}
                  />
                </FieldShell>
              </form>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              {step === 'password' ? (
                <Link href="/forgot-password" className="text-sm font-medium text-[#4F6BF7] hover:underline">
                  Forgot password?
                </Link>
              ) : step === 'otp' ? (
                <button
                  type="button"
                  onClick={resendOtp}
                  className="text-sm font-medium text-[#4F6BF7] hover:underline"
                >
                  Resend code
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="flex items-center gap-3">
              {step !== 'email' && (
                <button
                  type="button"
                  onClick={goBack}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimarySubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-[#4F6BF7] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4F6BF7]/30 transition hover:bg-[#4560e8] disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
