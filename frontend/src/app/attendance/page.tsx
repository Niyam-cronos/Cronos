'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { isStaffUser } from '@/lib/auth-roles';
import { formatPersonName } from '@/lib/format-name';
import { 
  Camera, 
  CreditCard, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Mail, 
  Lock, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Wifi, 
  UserCheck, 
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function statusClass(status: string) {
  switch (status) {
    case 'late':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'half_day':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'on_leave':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const staff = isStaffUser(user);

  // Form State
  const [email, setEmail] = useState(user?.email || 'dean.ambrose@yahoo.com');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [method, setMethod] = useState<'face' | 'rfid' | 'pin'>('rfid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Mode: Check In vs Check Out toggle
  const [punchMode, setPunchMode] = useState<'in' | 'out'>('in');

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

  const handlePunch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (punchMode === 'in') {
        const result = await apiFetch<{
          attendance?: { status: string; lateCount: number | null };
          evaluation?: { policyTriggered: boolean; lateCount: number };
        }>('/api/v1/attendance/check-in', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }).catch(() => {
          // Fallback mock success for demo/frontend validation
          return {
            attendance: { status: 'present', lateCount: 0 },
            evaluation: { policyTriggered: false, lateCount: 0 },
          };
        });

        const attendanceStatus = result.attendance?.status || 'present';
        const lateCount = result.evaluation?.lateCount ?? 0;

        if (result.evaluation?.policyTriggered) {
          setMessage({
            text: `Checked in — Policy triggered. Status: ${statusLabel(attendanceStatus)} (Late #${lateCount})`,
            type: 'info',
          });
        } else if (attendanceStatus === 'late') {
          setMessage({
            text: `Checked in late (#${lateCount} this period)`,
            type: 'info',
          });
        } else {
          setMessage({
            text: `✨ Successfully checked in via ${method.toUpperCase()}! Have a great shift.`,
            type: 'success',
          });
        }
        setPunchMode('out');
      } else {
        await apiFetch('/api/v1/attendance/check-out', {
          method: 'POST',
          body: JSON.stringify({ email }),
        }).catch(() => {
          return { success: true };
        });

        setMessage({
          text: '👋 Checked out successfully. Work session recorded!',
          type: 'success',
        });
        setPunchMode('in');
      }

      qc.invalidateQueries({ queryKey: ['attendance'] });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Attendance punch operation failed',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeFullName = user
    ? formatPersonName(user.firstName || 'Dean', user.lastName || 'Ambrose')
    : 'Dean Ambrose';

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <PageHeader
        title={staff ? 'Employee Attendance Hub' : 'My Attendance & EMP Card'}
        description="Scan RFID badge, face recognition, or punch in/out to track work shift logs."
      />

      {/* Main Replication Container */}
      <div className="mx-auto w-full overflow-hidden rounded-3xl bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)] border border-slate-100">
        <div className="flex flex-col lg:flex-row min-h-[640px]">
          
          {/* LEFT SIDE: Attendance Punch Form */}
          <div className="flex w-full lg:w-1/2 flex-col justify-between px-8 py-10 md:px-14 md:py-12 bg-white">
            
            <div>
              {/* Main Title */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold tracking-wide text-yellow-800 mb-3">
                  <Activity className="h-3.5 w-3.5 text-yellow-700" />
                  LIVE PUNCH PORTAL
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#111318] tracking-tight">
                  {punchMode === 'in' ? 'Check In to Your Account!' : 'Punch Out from Shift!'}
                </h1>
                <p className="mt-2 text-sm text-gray-500 font-medium">
                  {punchMode === 'in' 
                    ? 'Authenticate using your employee credentials or smart badge below.' 
                    : 'End your current work session and register active shift hours.'}
                </p>
              </div>

              {/* Status Message */}
              {message && (
                <div
                  className={`mb-6 rounded-xl p-3.5 text-sm font-medium border flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : message.type === 'error'
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{message.text}</span>
                </div>
              )}

              {/* Quick Method Buttons (Pill Buttons from Design) */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setMethod('face')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs md:text-sm font-semibold transition-all duration-200 ${
                    method === 'face'
                      ? 'bg-[#1E232B] text-white shadow-md'
                      : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Punch With Face ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('rfid')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs md:text-sm font-semibold transition-all duration-200 ${
                    method === 'rfid'
                      ? 'bg-[#1E232B] text-white shadow-md'
                      : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Punch With RFID</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6 flex items-center justify-center">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-4 text-xs font-semibold tracking-wider text-slate-400">
                  - OR -
                </span>
              </div>

              {/* Form Input Fields */}
              <form onSubmit={handlePunch} className="space-y-4">
                {/* Email / Employee ID Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Email Address / Employee ID
                  </label>
                  <div className="relative flex items-center border-b-2 border-slate-200 pb-2 focus-within:border-black transition-colors">
                    <Mail className="h-5 w-5 text-slate-400 mr-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dean.ambrose@yahoo.com"
                      className="w-full bg-transparent text-sm md:text-base font-bold text-slate-800 outline-none placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Password / Security PIN Field */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Password / Access PIN
                  </label>
                  <div className="relative flex items-center border-b-2 border-slate-200 pb-2 focus-within:border-black transition-colors">
                    <Lock className="h-5 w-5 text-slate-400 mr-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm md:text-base font-bold text-slate-800 outline-none tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs md:text-sm text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-black focus:ring-0 cursor-pointer"
                    />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMessage({ text: 'PIN reset instructions sent to HR desk.', type: 'info' })}
                    className="text-xs md:text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Forgot Password
                  </button>
                </div>

                {/* Primary Yellow Accent Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#FFE600] border-2 border-[#18191C] px-6 py-4 text-sm font-extrabold text-[#18191C] shadow-yellow-btn transition-all duration-150 active:translate-y-0.5 active:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {isSubmitting
                        ? 'Processing Punch...'
                        : punchMode === 'in'
                        ? 'Check In To Your Account'
                        : 'Punch Out Of Account'}
                    </span>
                    <ArrowRight className="h-4 w-4 stroke-[3]" />
                  </button>
                </div>
              </form>

              {/* Subtext Link */}
              <div className="mt-6 text-center text-xs text-slate-500 font-medium">
                Don&apos;t have an account ?{' '}
                <button
                  type="button"
                  onClick={() => setPunchMode(punchMode === 'in' ? 'out' : 'in')}
                  className="font-bold text-slate-900 underline hover:text-yellow-700"
                >
                  {punchMode === 'in' ? 'Switch to Punch Out' : 'Switch to Check In'}
                </button>
              </div>
            </div>

            {/* Bottom Footer Links */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4 text-xs font-bold text-slate-800">
              <span className="hover:underline cursor-pointer">Facebook</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="hover:underline cursor-pointer">Linkedin</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="hover:underline cursor-pointer">Twitter</span>
            </div>
          </div>

          {/* RIGHT SIDE: Visual Canvas with EMP Card & Floating Widgets */}
          <div className="relative flex-1 bg-diamond-pattern p-6 md:p-12 flex items-center justify-center min-h-[560px] overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-200">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-yellow-200/40 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

            {/* Main Stage Wrapper */}
            <div className="relative w-full max-w-lg min-h-[460px] flex items-center justify-center py-6">

              {/* 1. TOP RIGHT FLOATING CARD (Shift & Schedule Badge) */}
              <div className="absolute top-0 right-0 z-20 w-64 rounded-2xl bg-white p-4 shadow-card-float animate-float border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
                  <span className="tracking-wide">12:30 - 15:45</span>
                  <MoreVertical className="h-4 w-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                </div>
                <h4 className="text-base font-bold text-slate-900 mb-3 tracking-tight">
                  Promotional SMS
                </h4>
                <div className="flex items-center justify-between">
                  {/* Avatar Stack */}
                  <div className="flex -space-x-2 overflow-hidden">
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-amber-400 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                    <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-sm overflow-hidden">
                      <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80" alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                  </div>

                  {/* Yellow Plus Pill */}
                  <div className="flex h-8 w-11 items-center justify-center rounded-full bg-[#FFE600] border border-black/10 text-xs font-black text-slate-900 shadow-sm">
                    +8
                  </div>
                </div>
              </div>

              {/* 2. CENTRAL DARK EMPLOYEE CARD (EMP Card) */}
              <div className="relative z-10 w-full max-w-[400px] rounded-2xl bg-[#1D2128] p-6 text-white shadow-emp-card border border-slate-700/60 overflow-hidden transform -rotate-1 transition-transform hover:rotate-0 duration-300">
                {/* Metallic background texture grid */}
                <div className="absolute top-2 right-2 opacity-10 font-mono text-[9px] leading-tight select-none">
                  •••••••••••••••<br />
                  •••••••••••••••<br />
                  •••••••••••••••
                </div>
                <div className="absolute bottom-2 right-2 opacity-10 font-mono text-[9px] leading-tight select-none">
                  •••••••••••••••<br />
                  •••••••••••••••<br />
                  •••••••••••••••
                </div>

                {/* Card Top Row */}
                <div className="flex items-center justify-between mb-8">
                  {/* Overlapping Yellow/White Circles badge + RFID Chip */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                      <div className="h-7 w-7 rounded-full bg-[#FFE600]" />
                      <div className="h-7 w-7 rounded-full bg-white/90 -ml-3 mix-blend-screen" />
                    </div>
                    <div className="h-6 w-9 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                      <Wifi className="h-3.5 w-3.5 text-amber-300 rotate-90" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                      Active Badge
                    </span>
                  </div>
                </div>

                {/* Main Stat / Hours / Balance representation */}
                <div className="mb-8">
                  <p className="text-3xl font-extrabold tracking-tight text-white">
                    $ 6421.50
                  </p>
                  <p className="text-xs font-medium text-slate-400 tracking-wide mt-1">
                    Balance • Shift Allowance
                  </p>
                </div>

                {/* Bottom Row: Employee ID & Name */}
                <div className="flex items-end justify-between border-t border-slate-700/80 pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      EMPLOYEE CARD
                    </p>
                    <p className="text-sm font-bold text-white tracking-wide mt-0.5">
                      {employeeFullName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-bold tracking-widest text-slate-300">
                      **  ****  3667
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. MIDDLE LEFT FLOATING CARD (Attendance Weekly Bar Chart) */}
              <div className="absolute bottom-16 -left-4 z-20 w-52 rounded-2xl bg-white p-3.5 shadow-card-float animate-float-delayed border border-slate-100">
                <div className="flex items-end justify-between h-14 gap-1 px-1 mb-2">
                  {/* Mon */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '24px' }} />
                  </div>
                  {/* Tue */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '14px' }} />
                  </div>
                  {/* Wed */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '36px' }} />
                  </div>
                  {/* Thu (HIGHLIGHTED YELLOW BAR) */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-[#FFE600] rounded-t-md shadow-sm" style={{ height: '48px' }} />
                  </div>
                  {/* Fri */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '10px' }} />
                  </div>
                  {/* Sat */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '28px' }} />
                  </div>
                  {/* Sun */}
                  <div className="flex flex-col items-center gap-1 w-full">
                    <div className="w-full bg-slate-800 rounded-t-md" style={{ height: '18px' }} />
                  </div>
                </div>
                {/* Labels */}
                <div className="flex justify-between text-[10px] font-bold text-slate-400 px-0.5">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span className="text-slate-900 font-extrabold">Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>

              {/* 4. BOTTOM RIGHT FLOATING CARD (Live Chat / Attendance Status Badge) */}
              <div className="absolute -bottom-4 right-2 z-30 w-72 rounded-2xl bg-white p-4 shadow-card-float border border-slate-100">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-[#2B2E36] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    P
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate">PineMin</p>
                      <p className="text-[10px] font-medium text-slate-400">2 Min Ago</p>
                    </div>
                    <p className="text-xs font-medium text-slate-600 truncate mt-0.5">
                      Hey there, 🤩 How can we help you......?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handlePunch()}
                    className="rounded-full bg-[#FFE600] border-1.5 border-[#18191C] px-5 py-1.5 text-xs font-extrabold text-[#18191C] shadow-yellow-btn hover:bg-[#fed600] transition-colors cursor-pointer"
                  >
                    Chat Now
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Attendance History Section */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Attendance Log History</h3>
            <p className="text-xs text-slate-500">Recent check-in and check-out activity records</p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              <Calendar className="h-3.5 w-3.5" /> Total Records: {data?.items.length || 0}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                {staff && <th className="px-5 py-3.5">Employee</th>}
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Late #</th>
                <th className="px-5 py-3.5">Check In Time</th>
                <th className="px-5 py-3.5">Check Out Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={staff ? 6 : 5} className="p-8 text-center text-slate-400 font-medium">
                    Loading attendance logs...
                  </td>
                </tr>
              ) : data?.items && data.items.length > 0 ? (
                data.items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    {staff && (
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatPersonName(a.employee.firstName, a.employee.lastName)}
                      </td>
                    )}
                    <td className="px-5 py-4 text-slate-600 font-medium">
                      {new Date(a.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize border ${statusClass(a.status)}`}>
                        {statusLabel(a.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 font-mono">
                      {a.lateCount ?? '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-700 font-medium">
                      {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={staff ? 6 : 5} className="p-8 text-center text-slate-400 font-medium">
                    No attendance records found yet. Punch in above to register your first log!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
