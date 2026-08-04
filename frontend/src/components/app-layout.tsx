'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Building2,
  Settings,
  LogOut,
  Menu,
  Database,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: Clock },
  { href: '/leave', label: 'Leave', icon: CalendarDays },
  { href: '/masters/departments', label: 'Masters', icon: Database },
  { href: '/settings/company', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Cronos</span>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4">
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {user?.firstName} {user?.lastName}
          </p>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6 lg:hidden">
          <button onClick={() => setOpen(!open)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold">Cronos</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
