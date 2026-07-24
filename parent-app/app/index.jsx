import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../utils/responsive';
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
            { label: 'Live GPS tracking', accent: '#4a6fa5' },
            { label: 'Instant notifications', accent: '#2d6a4f' },
            { label: 'Attendance monitoring', accent: '#d97706' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={[styles.featureAccent, { backgroundColor: f.accent }]} />
              <Text style={styles.featureText}>{f.label}</Text>
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
          Keeping children safe on every journey
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
    marginBottom: verticalScale(24),
  },
  logoContainer: {
    width: verticalScale(90),
    height: verticalScale(90),
    borderRadius: verticalScale(24),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: verticalScale(12),
    elevation: 4,
    marginBottom: verticalScale(14),
  },
  logoEmoji: { fontSize: moderateScale(48) },
  appName: {
    fontSize: dynamicFontSize(32, 36, 42),
    fontWeight: 'bold',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },
  appNameAccent: {
    fontSize: dynamicFontSize(16, 18, 20),
    color: '#4a6fa5',
    fontWeight: '600',
    marginTop: verticalScale(8),
    letterSpacing: 1,
  },
  taglineSection: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
    paddingHorizontal: scale(8),
  },
  tagline: {
    fontSize: dynamicFontSize(17, 18, 20),
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  taglineSub: {
    fontSize: dynamicFontSize(12, 13, 14),
    color: '#718096',
    textAlign: 'center',
    lineHeight: moderateScale(22),
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: verticalScale(16),
    paddingVertical: verticalScale(18),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(28),
    gap: verticalScale(10),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: verticalScale(8),
    elevation: 2,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureAccent: {
    width: verticalScale(14),
    height: verticalScale(14),
    borderRadius: verticalScale(7),
    marginBottom: verticalScale(10),
  },
  featureText: {
    fontSize: dynamicFontSize(9, 10, 11),
    color: '#4a5568',
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  buttonsSection: {
    gap: verticalScale(16),
    width: '100%',
    maxWidth: scale(400),
  },
  chooseText: {
    fontSize: dynamicFontSize(13, 14, 15),
    color: '#718096',
    textAlign: 'center',
    marginBottom: verticalScale(8),
    fontWeight: '600',
  },
  parentButton: {
    backgroundColor: '#4a6fa5',
    borderRadius: verticalScale(16),
    borderLeftWidth: 0,
    borderLeftColor: '#4a6fa5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: verticalScale(12),
    elevation: 4,
  },
  driverButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: verticalScale(16),
    borderLeftWidth: 0,
    borderLeftColor: '#2d6a4f',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: verticalScale(12),
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: verticalScale(20),
    gap: verticalScale(14),
  },
  buttonEmoji: { fontSize: moderateScale(32) },
  buttonTextContainer: { flex: 1 },
  buttonTitle: {
    fontSize: dynamicFontSize(15, 16, 18),
    fontWeight: '700',
    color: '#fff',
  },
  buttonSub: {
    fontSize: dynamicFontSize(11, 12, 13),
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: verticalScale(4),
  },
  buttonArrow: {
    fontSize: dynamicFontSize(20, 22, 24),
    color: '#fff',
    fontWeight: '300',
  },
  footer: {
    paddingVertical: verticalScale(16),
    alignItems: 'center',
  },
  footerText: {
    fontSize: dynamicFontSize(10, 11, 12),
    color: '#a0aec0',
  },
});
