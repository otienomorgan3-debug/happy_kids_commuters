import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, SafeAreaView
} from 'react-native';
import { moderateScale, scale, verticalScale, dynamicFontSize } from '../../utils/responsive';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { addStudent } from '../../constants/api';

export default function AddChild() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    pickup_location: '',
    dropoff_location: '',
  });
  const router = useRouter();

  const handleSave = async () => {
    if (!form.name || !form.pickup_location || !form.dropoff_location) {
      return Alert.alert('Missing fields', 'Please fill in all fields before saving.');
    }

    setSaving(true);
    try {
      await addStudent({
        name: form.name,
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
      });

      Alert.alert('Success', 'Child added successfully');
      router.replace('/(parent)/dashboard');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add child');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Add Child</Text>
          <Text style={styles.subtitle}>
            Register another child under your parent account.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Child Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mary Wanjiku"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholderTextColor="#a0aec0"
            />

            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Umoja Stage"
              value={form.pickup_location}
              onChangeText={(text) => setForm({ ...form, pickup_location: text })}
              placeholderTextColor="#a0aec0"
            />

            <Text style={styles.label}>Drop-off Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Home - South B"
              value={form.dropoff_location}
              onChangeText={(text) => setForm({ ...form, dropoff_location: text })}
              placeholderTextColor="#a0aec0"
            />

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Child</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: scale(20), paddingBottom: verticalScale(40) },
  backButton: { alignSelf: 'flex-start', marginBottom: verticalScale(16) },
  backText: { color: '#4a6fa5', fontSize: moderateScale(15), fontWeight: '600' },
  title: { fontSize: dynamicFontSize(22, 24, 26), fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096', marginTop: verticalScale(6), marginBottom: verticalScale(20) },
  card: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(18),
    padding: scale(18),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: dynamicFontSize(11, 12, 13), fontWeight: '600', color: '#4a5568', marginBottom: verticalScale(6), marginTop: verticalScale(14) },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    fontSize: dynamicFontSize(13, 14, 15),
    color: '#2d3748',
    backgroundColor: '#f7fafc',
  },
  loadingBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(18),
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    padding: scale(14),
    backgroundColor: '#f7fafc',
  },
  emptyText: { color: '#718096', fontSize: dynamicFontSize(11, 12, 13) },
  schoolList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: verticalScale(10),
  },
  schoolChip: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: moderateScale(999),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    backgroundColor: '#fff',
  },
  schoolChipSelected: {
    backgroundColor: '#4a6fa5',
    borderColor: '#4a6fa5',
  },
  schoolChipText: { color: '#2d3748', fontSize: dynamicFontSize(11, 12, 13), fontWeight: '500' },
  schoolChipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#4a6fa5',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    marginTop: verticalScale(22),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: dynamicFontSize(14, 15, 16), fontWeight: '600' },
});
