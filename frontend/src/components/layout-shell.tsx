'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/app-layout';
import { LoadingSpinner } from '@/components/page-header';

const PUBLIC_PATHS = ['/', '/login', '/forgot-password', '/reset-password'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (loading && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (isPublic || !user) return <>{children}</>;
  return <AppLayout>{children}</AppLayout>;
}
