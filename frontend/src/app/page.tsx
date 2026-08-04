import Link from 'next/link';
import { Building2, Clock, Users, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">Cronos</span>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Workforce Attendance & HRMS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Modern enterprise HR management for companies from 20 to 10,000+ employees.
            Attendance, leave, payroll, and more — built to scale.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Employee Management',
              desc: 'Profiles, documents, skills, and org hierarchy',
            },
            {
              icon: Clock,
              title: 'Attendance',
              desc: 'Check-in/out, breaks, corrections, and face recognition',
            },
            {
              icon: BarChart3,
              title: 'Reports & Analytics',
              desc: 'Attendance, leave, payroll reports with exports',
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-lg border bg-card p-6 shadow-sm">
              <feature.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border bg-muted/50 p-6 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-2 h-5 w-5" />
          Milestone 1 complete — Monorepo foundation initialized. Next: Authentication & RBAC.
        </div>
      </main>
    </div>
  );
}
