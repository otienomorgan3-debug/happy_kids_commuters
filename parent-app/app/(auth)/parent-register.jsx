import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView, ScrollView
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { registerUser, setToken } from '../../constants/api';

export default function ParentRegister() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password)
      return Alert.alert('Error', 'Please fill in all fields');
    if (form.password !== form.confirmPassword)
      return Alert.alert('Error', 'Passwords do not match');
    if (form.password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters');

    setLoading(true);
    try {
      const res = await registerUser({
        name: form.name, email: form.email,
        phone: form.phone, password: form.password, role: 'parent'
      });
      await setToken(res.data.token);
      router.replace('/(parent)/dashboard');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Full Name', key: 'name', placeholder: '' },
    { label: 'Email', key: 'email', placeholder: 'Example:user@email.com', keyboard: 'email-address' },
    { label: 'Phone Number', key: 'phone', placeholder: '0712345678', keyboard: 'phone-pad' },
    { label: 'Password', key: 'password', placeholder: '••••••••', secure: true },
    { label: 'Confirm Password', key: 'confirmPassword', placeholder: '••••••••', secure: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join as a parent</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {fields.map(field => (
              <View key={field.key}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChangeText={t => setForm({ ...form, [field.key]: t })}
                  keyboardType={field.keyboard || 'default'}
                  secureTextEntry={field.secure || false}
                  autoCapitalize="none"
                  placeholderTextColor="#a0aec0"
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Create Account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  back: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { fontSize: 18, color: '#4a6fa5', fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 20 },
  emoji: { fontSize: 52, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 15, color: '#718096', marginTop: 4 },
  form: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#2d3748', backgroundColor: '#f7fafc',
  },
  button: {
    backgroundColor: '#4a6fa5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { fontSize: 13, color: '#718096' },
  loginBold: { color: '#4a6fa5', fontWeight: '600' },
});