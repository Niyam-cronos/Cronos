import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { APP } from '@/constants';
import { colors } from '@/theme';
import { ChronosLogo } from './ChronosLogo';

export function CronosBrandSplash() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />

      <View style={styles.center}>
        <ChronosLogo size="lg" variant="light" />
        <Text style={styles.tagline}>{APP.tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brandGradientStart,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  decorTop: {
    position: 'absolute',
    top: 48,
    right: 32,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  decorBottom: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  tagline: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
    marginTop: 8,
  },
});
