import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { APP } from '@/constants';
import { colors } from '@/theme';
import { CronosClockArt } from './CronosClockArt';

export function CronosBrandSplash() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Ionicons name="time-outline" size={30} color={colors.white} />
        <Text style={styles.brand}>{APP.brandLabel}</Text>
      </View>

      <View style={styles.center}>
        <CronosClockArt />
      </View>

      <Text style={styles.tagline}>{APP.tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});
