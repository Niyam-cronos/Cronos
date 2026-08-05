import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CronosBrandSplash } from '@/components';
import { AuthProvider, useAuth } from '@/contexts';
import { useAppSplash } from '@/hooks';
import { HomeScreen, LoginScreen } from '@/screens';
import { colors } from '@/theme';

function AppContent() {
  const { isReady: splashReady } = useAppSplash();
  const { user, loading } = useAuth();

  if (!splashReady) {
    return <CronosBrandSplash />;
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <HomeScreen />;
}

export function RootApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
