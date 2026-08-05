import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ChronosLogo } from '@/components/brand/ChronosLogo';
import { useAuth } from '@/contexts';
import {
  getLoginMethod,
  loginWithPassword,
  requestLoginOtp,
  verifyLoginOtp,
} from '@/services/auth';
import { colors } from '@/theme';

type Step = 'email' | 'password' | 'otp';

const STEP_HINT: Record<Step, string> = {
  email: 'Enter your work email to continue',
  password: 'Enter your password',
  otp: 'Enter the 4-digit code sent to your email',
};

export function LoginScreen() {
  const { refresh, setUser } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const resetToEmail = () => {
    setStep('email');
    setPassword('');
    setOtp('');
    setError('');
    setInfo('');
  };

  const onContinueEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const method = await getLoginMethod(trimmed);
      setEmail(trimmed);
      if (method === 'otp') {
        const result = await requestLoginOtp(trimmed);
        setInfo(result.message);
        setStep('otp');
      } else {
        setStep('password');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue');
    } finally {
      setSubmitting(false);
    }
  };

  const onLoginPassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await loginWithPassword(email, password);
      setUser(user);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyOtp = async (code = otp) => {
    if (!/^\d{4}$/.test(code)) {
      setError('Enter the 4-digit code');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const user = await verifyLoginOtp(email, code);
      setUser(user);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setSubmitting(false);
    }
  };

  const onResendOtp = async () => {
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      const result = await requestLoginOtp(email);
      setInfo(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code');
    } finally {
      setSubmitting(false);
    }
  };

  const onOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const digits = otp.padEnd(4, ' ').split('');
    digits[index] = digit || ' ';
    const next = digits.join('').replace(/ /g, '');
    setOtp(next);

    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
    if (next.length === 4) {
      onVerifyOtp(next);
    }
  };

  const onOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const onPrimaryPress = () => {
    if (step === 'email') onContinueEmail();
    else if (step === 'password') onLoginPassword();
    else onVerifyOtp();
  };

  const primaryLabel =
    submitting ? 'Please wait…' : step === 'email' ? 'Continue' : step === 'password' ? 'Sign in' : 'Verify';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Branded header — full bleed, not a web card */}
      <SafeAreaView style={styles.heroSafe}>
      <View style={styles.hero}>
        <View style={styles.heroDecor} />
        {step !== 'email' && (
          <Pressable onPress={resetToEmail} style={styles.backIcon} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </Pressable>
        )}
        <View style={styles.heroContent}>
          <ChronosLogo size="lg" variant="light" />
          <Text style={styles.heroTitle}>Sign in</Text>
          <Text style={styles.heroSubtitle}>{STEP_HINT[step]}</Text>
        </View>
      </View>
      </SafeAreaView>

      {/* Native bottom sheet form */}
      <KeyboardAvoidingView
        style={styles.sheetWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          <ScrollView
            contentContainerStyle={styles.sheetScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View style={styles.alertError}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.alertErrorText}>{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View style={styles.alertInfo}>
                <Ionicons name="mail-outline" size={18} color={colors.successText} />
                <Text style={styles.alertInfoText}>{info}</Text>
              </View>
            ) : null}

            {step === 'email' && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Work email</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={20} color={colors.brand} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@company.com"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            {step === 'password' && (
              <>
                <View style={styles.emailChip}>
                  <Ionicons name="person-circle-outline" size={20} color={colors.brand} />
                  <Text style={styles.emailChipText}>{email}</Text>
                </View>
                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputRow}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.brand} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Your password"
                      placeholderTextColor={colors.textSecondary}
                      secureTextEntry={!showPassword}
                      autoFocus
                      style={styles.input}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={colors.textSlate}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {step === 'otp' && (
              <>
                <View style={styles.emailChip}>
                  <Ionicons name="mail-outline" size={20} color={colors.brand} />
                  <Text style={styles.emailChipText}>{email}</Text>
                </View>
                <Text style={styles.otpLabel}>Verification code</Text>
                <View style={styles.otpRow}>
                  {[0, 1, 2, 3].map((i) => (
                    <TextInput
                      key={i}
                      ref={(ref) => {
                        otpRefs.current[i] = ref;
                      }}
                      value={otp[i] ?? ''}
                      onChangeText={(v) => onOtpChange(v, i)}
                      onKeyPress={({ nativeEvent }) => onOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      style={styles.otpBox}
                      selectTextOnFocus
                    />
                  ))}
                </View>
                <Pressable onPress={onResendOtp} disabled={submitting} style={styles.resendBtn}>
                  <Text style={styles.resendText}>Didn&apos;t get it? Resend code</Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          {/* Sticky bottom action — standard mobile pattern */}
          <SafeAreaView style={styles.footerSafe}>
          <View style={styles.footer}>
            <Pressable
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={onPrimaryPress}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.white} />
                </>
              )}
            </Pressable>
          </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandGradientStart,
  },
  heroSafe: {
    backgroundColor: colors.brandGradientStart,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    minHeight: 200,
  },
  heroDecor: {
    position: 'absolute',
    right: -20,
    top: 40,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  backIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroContent: {
    gap: 12,
    marginTop: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
    maxWidth: 280,
  },
  sheetWrap: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  sheetScroll: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    flexGrow: 1,
  },
  fieldBlock: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSlate,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 24,
  },
  emailChipText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  otpLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSlate,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 72,
    borderWidth: 2,
    borderColor: colors.inputBackground,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
  },
  resendBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand,
  },
  footerSafe: {
    backgroundColor: colors.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: colors.white,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryBtnDisabled: {
    opacity: 0.75,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertErrorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successBg,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.successText,
  },
});
