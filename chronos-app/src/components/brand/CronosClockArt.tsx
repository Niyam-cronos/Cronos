import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function CronosClockArt() {
  return (
    <View style={styles.wrap}>
      <View style={styles.glowLeft} />
      <View style={styles.glowRight} />
      <View style={styles.decorLeft} />
      <View style={styles.decorRight} />

      <View style={styles.clock}>
        <View style={styles.clockInner} />
        <View style={[styles.hand, styles.hourHand]} />
        <View style={[styles.hand, styles.minuteHand]} />
        <View style={styles.centerDot} />
        <View style={styles.figure}>
          <View style={styles.figureHead} />
          <View style={styles.figureBody} />
        </View>
      </View>
    </View>
  );
}

const CLOCK = 220;

const styles = StyleSheet.create({
  wrap: {
    width: CLOCK + 80,
    height: CLOCK + 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowLeft: {
    position: 'absolute',
    left: 8,
    top: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  glowRight: {
    position: 'absolute',
    right: 0,
    bottom: 28,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(123,147,255,0.35)',
  },
  decorLeft: {
    position: 'absolute',
    left: 0,
    bottom: 48,
    width: 48,
    height: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  decorRight: {
    position: 'absolute',
    right: 12,
    top: 36,
    width: 36,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  clock: {
    width: CLOCK,
    height: CLOCK,
    borderRadius: CLOCK / 2,
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  clockInner: {
    position: 'absolute',
    width: CLOCK - 28,
    height: CLOCK - 28,
    borderRadius: (CLOCK - 28) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hand: {
    position: 'absolute',
    width: 4,
    backgroundColor: colors.white,
    borderRadius: 2,
    bottom: '50%',
    left: '50%',
    marginLeft: -2,
    transformOrigin: 'bottom center',
  },
  hourHand: {
    height: 68,
    transform: [{ rotate: '-35deg' }],
  },
  minuteHand: {
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.92)',
    transform: [{ rotate: '75deg' }],
  },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
  },
  figure: {
    position: 'absolute',
    bottom: 42,
    alignItems: 'center',
  },
  figureHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4B4C4',
    marginBottom: 4,
  },
  figureBody: {
    width: 46,
    height: 40,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#F08FA8',
  },
});
