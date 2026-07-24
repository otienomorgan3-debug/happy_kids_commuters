import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { loginUser, setToken } from '../../constants/api';

export default function ParentLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!form.email || !form.password)
      return Alert.alert('Error', 'Please fill in all fields');

    setLoading(true);
    try {
      const res = await loginUser(form);
      const { token, user } = res.data;

      if (user.role !== 'parent')
        return Alert.alert('Access Denied', 'This login is for parents only');

      await setToken(token);
      router.replace('/(parent)/dashboard');

    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Parent Sign In</Text>
          <Text style={styles.subtitle}>Track student journey</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={form.email}
            onChangeText={t => setForm({ ...form, email: t })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#a0aec0"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={form.password}
            onChangeText={t => setForm({ ...form, password: t })}
            secureTextEntry
            placeholderTextColor="#a0aec0"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/parent-register')}
          >
            <Text style={styles.registerText}>
              New here? <Text style={styles.registerBold}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  back: { paddingTop: verticalScale(12), paddingHorizontal: scale(20), paddingBottom: verticalScale(16) },
  backText: { fontSize: moderateScale(18), color: '#4a6fa5', fontWeight: '600' },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emoji: { fontSize: moderateScale(52), marginBottom: verticalScale(12) },
  title: { fontSize: moderateScale(28), fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: moderateScale(15), color: '#718096', marginTop: verticalScale(4) },
  form: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: scale(400),
    borderRadius: verticalScale(20),
    padding: verticalScale(24),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: verticalScale(12),
    elevation: 3,
  },
  label: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: verticalScale(6),
    marginTop: verticalScale(14),
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: verticalScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(15),
    color: '#2d3748',
    backgroundColor: '#f7fafc',
  },
  button: {
    backgroundColor: '#4a6fa5',
    borderRadius: verticalScale(12),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    marginTop: verticalScale(24),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: moderateScale(16), fontWeight: '600' },
  registerLink: { alignItems: 'center', marginTop: verticalScale(16) },
  registerText: { fontSize: moderateScale(13), color: '#718096' },
  registerBold: { color: '#4a6fa5', fontWeight: '600' },
});