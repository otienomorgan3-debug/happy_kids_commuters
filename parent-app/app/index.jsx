import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from '../constants/api';

export default function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = await AsyncStorage.getItem('hkcs_token');
        if (token) {
          const res = await getMe();
          const role = res.data.user.role;
          if (role === 'parent') {
            router.replace('/(parent)/dashboard');
          } else if (role === 'driver') {
            router.replace('/(driver)/home');
          }
        }
      } catch {
        await AsyncStorage.removeItem('hkcs_token');
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, [router]);

  if (checking) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top decoration */}
      <View style={styles.topDecoration} />

      {/* Main content */}
      <View style={styles.content}>

        {/* Logo and branding */}
        <View style={styles.brandSection}>
          <Text style={styles.appName}>Happy Kids</Text>
          <Text style={styles.appNameAccent}>Commuter System</Text>
        </View>

        {/* Tagline */}
        <View style={styles.taglineSection}>
          <Text style={styles.tagline}>
            Safe, reliable school transportation
          </Text>
          <Text style={styles.taglineSub}>
            Track student journey in real-time, get instant alerts,
            and stay connected with their school bus every step of the way.
          </Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {[
            { icon: '📍', text: 'Live GPS tracking' },
            { icon: '🔔', text: 'Instant notifications' },
            { icon: '✅', text: 'Attendance monitoring' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsSection}>
          <Text style={styles.chooseText}>Choose sign in button</Text>

          <TouchableOpacity
            style={styles.parentButton}
            onPress={() => router.push('/(auth)/parent-login')}
          >
            <View style={styles.buttonInner}>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>I am a Parent</Text>
                <Text style={styles.buttonSub}>Track student bus</Text>
              </View>
              <Text style={styles.buttonArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.driverButton}
            onPress={() => router.push('/(auth)/driver-login')}
          >
            <View style={styles.buttonInner}>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonTitle}>I am a Driver</Text>
                <Text style={styles.buttonSub}>Manage your route and students</Text>
              </View>
              <Text style={styles.buttonArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Keeping children safe on every journey 🌟
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#e8f4f8',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 48 },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },
  appNameAccent: {
    fontSize: 20,
    color: '#4a6fa5',
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 1,
  },
  taglineSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 12,
  },
  taglineSub: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: { fontSize: 22, marginBottom: 6 },
  featureText: {
    fontSize: 11,
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonsSection: {
    gap: 16,
    width: '100%',
    maxWidth: 400,
  },
  chooseText: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  parentButton: {
    backgroundColor: '#4a6fa5',
    borderRadius: 16,
    borderLeftWidth: 0,
    borderLeftColor: '#4a6fa5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  driverButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    borderLeftWidth: 0,
    borderLeftColor: '#2d6a4f',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  buttonEmoji: { fontSize: 32 },
  buttonTextContainer: { flex: 1 },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  buttonSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  buttonArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#a0aec0',
  },
});
