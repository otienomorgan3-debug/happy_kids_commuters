import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView,
  Platform, SafeAreaView
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { addStudent, getSchools } from '../../constants/api';

export default function AddChild() {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [form, setForm] = useState({
    name: '',
    pickup_location: '',
    dropoff_location: '',
  });
  const router = useRouter();

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await getSchools();
        setSchools(res.data.schools || []);
        if (res.data.schools?.length > 0) {
          setSelectedSchoolId(String(res.data.schools[0].id));
        }
      } catch (error) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load schools');
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  const handleSave = async () => {
    if (!form.name || !selectedSchoolId || !form.pickup_location || !form.dropoff_location) {
      return Alert.alert('Missing fields', 'Please fill in all fields before saving.');
    }

    setSaving(true);
    try {
      await addStudent({
        name: form.name,
        school_id: Number(selectedSchoolId),
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

            <Text style={styles.label}>School</Text>
            {loadingSchools ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#4a6fa5" />
              </View>
            ) : schools.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No schools available yet.</Text>
              </View>
            ) : (
              <View style={styles.schoolList}>
                {schools.map((school) => {
                  const isSelected = String(school.id) === selectedSchoolId;
                  return (
                    <TouchableOpacity
                      key={school.id}
                      style={[styles.schoolChip, isSelected && styles.schoolChipSelected]}
                      onPress={() => setSelectedSchoolId(String(school.id))}
                    >
                      <Text style={[styles.schoolChipText, isSelected && styles.schoolChipTextSelected]}>
                        {school.school_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

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
              disabled={saving || loadingSchools}
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
  content: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: 16 },
  backText: { color: '#4a6fa5', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#718096', marginTop: 6, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2d3748',
    backgroundColor: '#f7fafc',
  },
  loadingBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f7fafc',
  },
  emptyText: { color: '#718096', fontSize: 13 },
  schoolList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  schoolChip: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  schoolChipSelected: {
    backgroundColor: '#4a6fa5',
    borderColor: '#4a6fa5',
  },
  schoolChipText: { color: '#2d3748', fontSize: 13, fontWeight: '500' },
  schoolChipTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#4a6fa5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
