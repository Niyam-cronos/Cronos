'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Clock,
  Users,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';
import { getLoginMethod, loginUser, requestLoginOtp, verifyLoginOtp } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { ChronosLogo } from '@/components/ui/chronos-logo';

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
type LangCode = 'en' | 'kn' | 'hi';

const LANGUAGES: Array<{ code: LangCode; name: string; flag: string }> = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
];

const TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    welcome: 'Welcome!',
    login: 'Login',
    subtitle: 'You can login with your email and password.',
    emailLabel: 'E-mail',
    emailPlaceholder: 'tina@gyroitsolutions.com',
    passwordLabel: 'Password',
    otpLabel: 'Verification Code',
    otpPlaceholder: '4-digit code',
    forgotPassword: 'Forgot My Password',
    resendCode: 'Resend Code',
    loginBtn: 'Login',
    authenticating: 'Authenticating...',
    verifyBtn: 'Verify & Sign In',
    feature1Title: 'Shift & Attendance',
    feature1Desc: 'Track employee check-ins and shift schedules in real-time. Automatically process late logs and policy rules.',
    feature2Title: 'Workforce & Staff',
    feature2Desc: 'Manage employee profiles, leave balances, and department access permissions in one unified hub.',
    feature3Title: 'Dashboard & Analytics',
    feature3Desc: 'Analyze daily attendance metrics, active shifts, and pending approvals with live visual graphs.',
    previewTitle: 'Chronos Shift Schedule',
    previewDept: 'Department: Engineering',
    previewAction: 'Active Shifts →',
  },
  kn: {
    welcome: 'ಸ್ವಾಗತ!',
    login: 'ಲಾಗಿನ್ ಮಾಡಿ',
    subtitle: 'ನಿಮ್ಮ ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಬಳಸಿ ಲಾಗಿನ್ ಆಗಬಹುದು.',
    emailLabel: 'ಇಮೇಲ್ ವಿಳಾಸ',
    emailPlaceholder: 'tina@gyroitsolutions.com',
    passwordLabel: 'ಪಾಸ್‌ವರ್ಡ್',
    otpLabel: 'ಪರಿಶೀಲನೆ ಕೋಡ್',
    otpPlaceholder: '4-ಅಂಕಿಯ ಕೋಡ್',
    forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?',
    resendCode: 'ಕೋಡ್ ಮರುಕಳುಹಿಸಿ',
    loginBtn: 'ಲಾಗಿನ್ ಮಾಡಿ',
    authenticating: 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    verifyBtn: 'ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಪ್ರವೇಶಿಸಿ',
    feature1Title: 'ಪಾಳಿ ಮತ್ತು ಹಾಜರಾತಿ',
    feature1Desc: 'ನೌಕರರ ಹಾಜರಾತಿ ಮತ್ತು ಪಾಳಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ನೈಜ ಸಮಯದಲ್ಲಿ ವೀಕ್ಷಿಸಿ. ತಡವಾದ ಲಾಗ್‌ಗಳು ಮತ್ತು ನೀತಿ ನಿಯಮಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ.',
    feature2Title: 'ಸಿಬ್ಬಂದಿ ನಿರ್ವಹಣೆ',
    feature2Desc: 'ನೌಕರರ ಪ್ರೊಫೈಲ್, ರಜೆ ಬಾಕಿ ಮತ್ತು ಇಲಾಖೆಯ ಪ್ರವೇಶ ಅನುಮತಿಗಳನ್ನು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ನಿರ್ವಹಿಸಿ.',
    feature3Title: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮತ್ತು ವಿಶ್ಲೇಷಣೆ',
    feature3Desc: 'ದೈನಂದಿನ ಹಾಜರಾತಿ ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಸಕ್ರಿಯ ಪಾಳಿಗಳನ್ನು ಲೈವ್ ಗ್ರಾಫ್‌ಗಳೊಂದಿಗೆ ವಿಶ್ಲೇಷಿಸಿ.',
    previewTitle: 'ಕ್ರೋನೋಸ್ ಪಾಳಿ ವೇಳಾಪಟ್ಟಿ',
    previewDept: 'ಇಲಾಖೆ: ಇಂಜಿನಿಯರಿಂಗ್',
    previewAction: 'ಸಕ್ರಿಯ ಪಾಳಿಗಳು →',
  },
  hi: {
    welcome: 'स्वागत है!',
    login: 'लॉगिन करें',
    subtitle: 'आप अपने ईमेल और पासवर्ड से लॉगिन कर सकते हैं।',
    emailLabel: 'ईमेल पता',
    emailPlaceholder: 'tina@gyroitsolutions.com',
    passwordLabel: 'पासवर्ड',
    otpLabel: 'सत्यापन कोड',
    otpPlaceholder: '4-अंकों का कोड',
    forgotPassword: 'पासवर्ड भूल गए?',
    resendCode: 'कोड पुनः भेजें',
    loginBtn: 'लॉगिन करें',
    authenticating: 'प्रमाणित किया जा रहा है...',
    verifyBtn: 'सत्यापित करें और प्रवेश करें',
    feature1Title: 'शिफ्ट और उपस्थिति',
    feature1Desc: 'कर्मचारियों की उपस्थिति और शिफ्ट समय सारणी को वास्तविक समय में ट्रैक करें। देरी के लॉग और नीति नियमों को स्वचालित रूप से संसाधित करें।',
    feature2Title: 'कार्यबल और कर्मचारी',
    feature2Desc: 'कर्मचारी प्रोफ़ाइल, अवकाश शेष और विभाग अनुमतियों को एक ही एकीकृत हब में प्रबंधित करें।',
    feature3Title: 'डैशबोर्ड और विश्लेषण',
    feature3Desc: 'लाइव विज़ुअल ग्राफ़ के साथ दैनिक उपस्थिति मीट्रिक, सक्रिय शिफ्ट और लंबित स्वीकृतियों का विश्लेषण करें।',
    previewTitle: 'क्रोनोस शिफ्ट समय सारणी',
    previewDept: 'विभाग: इंजीनियरिंग',
    previewAction: 'सक्रिय शिफ्ट →',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const t = TRANSLATIONS[selectedLang.code];

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  const onEmailSubmit = async (data: EmailForm) => {
    setError('');
    setInfo('');
    try {
      const loginMeth = await getLoginMethod(data.email);
      setEmail(data.email);

      if (loginMeth === 'otp') {
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
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#EBF0FA] p-4 md:p-8 font-sans">
      
      {/* Outer Floating Card Container */}
      <div className="flex w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-[0_25px_70px_rgba(30,58,138,0.15)] min-h-[660px]">
        
        {/* LEFT PANEL: Clean White Login Area */}
        <div className="flex w-full lg:w-5/12 flex-col justify-between p-8 md:p-12 bg-white relative">
          <div>
            
            {/* Top Row: Brand & Interactive Multi-Language Switcher */}
            <div className="flex items-center justify-between mb-10">
              {/* Brand Logo with Custom Vector Attendance Emblem */}
              <ChronosLogo size="md" />

              {/* Language Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>{selectedLang.flag} {selectedLang.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {langMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setSelectedLang(lang);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left cursor-pointer ${
                          selectedLang.code === lang.code
                            ? 'bg-[#4355FF]/10 text-[#4355FF]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Welcome Heading */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#4355FF] tracking-tight">
                {t.welcome}
              </h1>
              <h2 className="text-xl font-bold text-slate-800 mt-4">
                {t.login}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                {t.subtitle}
              </p>
            </div>

            {/* Error / Info Alerts */}
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-200">
                {error}
              </div>
            )}
            {info && (
              <div className="mb-5 rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                {info}
              </div>
            )}

            {/* Input Form Fields */}
            <div className="space-y-4">
              {step === 'email' && (
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {t.emailLabel}
                    </label>
                    <div className="rounded-xl bg-[#F2F4F8] px-4 py-3.5 border border-transparent focus-within:border-[#4355FF] focus-within:bg-white transition-all">
                      <input
                        type="email"
                        placeholder={t.emailPlaceholder}
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                        {...emailForm.register('email')}
                      />
                    </div>
                    {emailForm.formState.errors.email && (
                      <p className="mt-1 text-xs text-red-600 font-semibold">
                        {emailForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </form>
              )}

              {step === 'password' && (
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {t.emailLabel}
                    </label>
                    <div className="rounded-xl bg-[#F2F4F8] px-4 py-3.5">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {t.passwordLabel}
                    </label>
                    <div className="relative flex items-center rounded-xl bg-[#F2F4F8] px-4 py-3.5 border border-transparent focus-within:border-[#4355FF] focus-within:bg-white transition-all">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none tracking-widest placeholder:text-slate-400"
                        {...passwordForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-700 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.password && (
                      <p className="mt-1 text-xs text-red-600 font-semibold">
                        {passwordForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {t.emailLabel}
                    </label>
                    <div className="rounded-xl bg-[#F2F4F8] px-4 py-3.5">
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-transparent text-sm font-bold text-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      {t.otpLabel}
                    </label>
                    <div className="relative flex items-center rounded-xl bg-[#F2F4F8] px-4 py-3.5 border border-transparent focus-within:border-[#4355FF] focus-within:bg-white transition-all">
                      <KeyRound className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder={t.otpPlaceholder}
                        autoComplete="one-time-code"
                        className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none tracking-widest placeholder:text-slate-400"
                        {...otpForm.register('otp')}
                      />
                    </div>
                    {otpForm.formState.errors.otp && (
                      <p className="mt-1 text-xs text-red-600 font-semibold">
                        {otpForm.formState.errors.otp.message}
                      </p>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-2">
              {step === 'password' ? (
                <Link href="/forgot-password" className="text-xs font-semibold text-slate-500 hover:text-[#4355FF]">
                  {t.forgotPassword}
                </Link>
              ) : step === 'otp' ? (
                <button
                  type="button"
                  onClick={resendOtp}
                  className="text-xs font-semibold text-slate-500 hover:text-[#4355FF]"
                >
                  {t.resendCode}
                </button>
              ) : (
                <span />
              )}
            </div>

            {/* Primary Blue Action Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={handlePrimarySubmit}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#4355FF] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4355FF]/30 transition-all hover:bg-[#3444ea] active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting
                  ? t.authenticating
                  : step === 'email'
                  ? t.loginBtn
                  : step === 'password'
                  ? t.loginBtn
                  : t.verifyBtn}
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: Vibrant Royal Blue Showcase Area */}
        <div className="relative hidden lg:flex w-7/12 flex-col justify-between p-12 bg-gradient-to-br from-[#4A5DFF] to-[#3B4BEA] text-white overflow-hidden">
          
          {/* Geometric Translucent Background Elements */}
          <div className="absolute top-10 right-10 h-32 w-32 rounded-full border-8 border-white/10" />
          <div className="absolute top-1/3 left-[-30px] h-20 w-44 rounded-full bg-white/10 blur-sm" />
          <div className="absolute bottom-10 left-12 h-36 w-36 rounded-full border-8 border-white/10" />
          <div className="absolute bottom-1/4 right-[-20px] h-24 w-52 rounded-full bg-white/10" />

          {/* Feature Highlight List & Dashboard Preview Container */}
          <div className="relative z-10 grid grid-cols-12 gap-6 items-center my-auto">
            
            {/* Feature List */}
            <div className="col-span-6 space-y-8 pr-2">
              
              {/* Feature 1 */}
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4355FF] shadow-md">
                  <Clock className="h-5 w-5 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {t.feature1Title}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed font-normal">
                  {t.feature1Desc}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4355FF] border border-white/30 text-white shadow-md">
                  <Users className="h-5 w-5 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {t.feature2Title}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed font-normal">
                  {t.feature2Desc}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#4355FF] shadow-md">
                  <LayoutDashboard className="h-5 w-5 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  {t.feature3Title}
                </h3>
                <p className="text-xs text-white/80 leading-relaxed font-normal">
                  {t.feature3Desc}
                </p>
              </div>

            </div>

            {/* Dashboard UI Preview Graphic */}
            <div className="col-span-6 relative">
              <div className="rounded-2xl bg-white/95 p-4 shadow-2xl text-slate-800 border border-white/40 transform translate-x-3 rotate-1 hover:rotate-0 transition-transform duration-300">
                
                {/* Header bar inside preview */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3 text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{t.previewTitle}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[9px]">
                    <span>09:00</span>
                    <span className="bg-blue-100 text-blue-700 px-1 rounded">11:00</span>
                    <span>13:00</span>
                  </div>
                </div>

                {/* Table Rows preview */}
                <div className="space-y-2.5 text-[10px]">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-extrabold text-slate-900">Dev Shift 1</p>
                      <p className="text-[9px] text-slate-400">4 Staff</p>
                    </div>
                    <span className="bg-blue-500 text-white text-[9px] px-2.5 py-0.5 rounded font-semibold">
                      Tina Gyroit
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-extrabold text-slate-900">Ops Shift 2</p>
                      <p className="text-[9px] text-slate-400">2 Staff</p>
                    </div>
                    <span className="bg-amber-500 text-white text-[9px] px-2.5 py-0.5 rounded font-semibold">
                      Yunus Bulut
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-extrabold text-slate-900">Support Shift</p>
                      <p className="text-[9px] text-slate-400">6 Staff</p>
                    </div>
                    <span className="bg-emerald-500 text-white text-[9px] px-2.5 py-0.5 rounded font-semibold">
                      Melike Arslan
                    </span>
                  </div>
                </div>

                {/* Footer preview */}
                <div className="mt-3 border-t border-slate-100 pt-2 flex items-center justify-between text-[9px] font-semibold text-slate-400">
                  <span>{t.previewDept}</span>
                  <span className="text-[#4355FF] font-bold">{t.previewAction}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
