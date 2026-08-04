import { View, Text, StyleSheet } from 'react-native';
import Constants from 'expo-constants';

export default function HomeScreen() {
  const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cronos Mobile</Text>
      <Text style={styles.subtitle}>Workforce Attendance & HRMS</Text>
      <Text style={styles.meta}>API: {apiUrl}</Text>
      <Text style={styles.note}>Full mobile app — Milestone 9</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748b',
  },
  meta: {
    marginTop: 24,
    fontSize: 14,
    color: '#94a3b8',
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    color: '#cbd5e1',
  },
});
