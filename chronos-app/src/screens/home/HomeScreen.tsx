import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChronosLogo } from '@/components/brand/ChronosLogo';
import { useAuth } from '@/contexts';
import { colors } from '@/theme';

export function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ChronosLogo size="md" />
      <Text style={styles.greeting}>
        Welcome, {user?.firstName ?? 'there'}!
      </Text>
      <Text style={styles.subtitle}>Workforce Attendance & HRMS</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  greeting: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  email: {
    fontSize: 13,
    color: colors.textSlate,
    marginTop: 4,
  },
  logoutBtn: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  logoutText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
