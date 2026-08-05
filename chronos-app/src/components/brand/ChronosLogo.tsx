import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme';

type ChronosLogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  variant?: 'light' | 'dark';
};

const BOX_SIZES = { sm: 32, md: 44, lg: 56 };
const ICON_SIZES = { sm: 20, md: 26, lg: 32 };
const TEXT_SIZES = { sm: 16, md: 20, lg: 24 };

export function ChronosLogo({
  size = 'md',
  showText = true,
  variant = 'dark',
}: ChronosLogoProps) {
  const box = BOX_SIZES[size];
  const icon = ICON_SIZES[size];
  const isLight = variant === 'light';

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.badge,
          {
            width: box,
            height: box,
            borderRadius: size === 'sm' ? 8 : 16,
            backgroundColor: isLight ? 'rgba(255,255,255,0.15)' : colors.brand,
            borderColor: isLight ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)',
          },
        ]}
      >
        <Svg width={icon} height={icon} viewBox="0 0 32 32" fill="none">
          <Path
            d="M16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28C21.306 28 25.8073 24.5574 27.3486 19.7895"
            stroke={colors.white}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          <Path
            d="M11 16L14.5 19.5L25 9"
            stroke={colors.accentYellow}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx={16} cy={16} r={1.5} fill={colors.white} opacity={0.8} />
        </Svg>
      </View>

      {showText && (
        <View style={styles.textWrap}>
          <Text
            style={[
              styles.brand,
              { fontSize: TEXT_SIZES[size], color: isLight ? colors.white : colors.textPrimary },
            ]}
          >
            CHRONOS
          </Text>
          <Text style={[styles.tagline, { color: isLight ? colors.textMuted : colors.brand }]}>
            ATTENDANCE
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: colors.brand,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  textWrap: {
    gap: 2,
  },
  brand: {
    fontWeight: '900',
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
});
