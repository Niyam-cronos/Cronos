'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';
import { formatPersonName } from '@/lib/format-name';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  department?: { name: string };
  designation?: { name: string };
  user?: {
    userRoles?: Array<{ role: { slug: string; name: string } }>;
  };
}

interface Paginated<T> {
  items: T[];
  total: number;
}

export default function EmployeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiFetch<Paginated<Employee>>('/api/v1/employees'),
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage employee records"
        actions={
          <Link href="/employees/create" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Add Employee
          </Link>
        }
      />
      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Department</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.items.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No employees found</td></tr>
            ) : (
              data?.items.map((emp) => {
                const roleSlug = emp.user?.userRoles?.[0]?.role.slug;
                const roleLabel =
                  roleSlug === 'hr'
                    ? 'HR'
                    : roleSlug === 'admin'
                      ? 'Admin'
                      : roleSlug === 'manager'
                        ? 'Manager'
                        : roleSlug
                          ? 'Employee'
                          : '—';

                return (
                <tr key={emp.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">{emp.employeeCode}</td>
                  <td className="p-3">{formatPersonName(emp.firstName, emp.lastName)}</td>
                  <td className="p-3">{emp.email}</td>
                  <td className="p-3">{emp.department?.name ?? '—'}</td>
                  <td className="p-3">{roleLabel}</td>
                  <td className="p-3 capitalize">{emp.status}</td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
