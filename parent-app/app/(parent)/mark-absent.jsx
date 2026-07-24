import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getMyStudents, markChildAbsent } from '../../constants/api';

export default function MarkAbsentScreen() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const loadStudents = useCallback(async () => {
    try {
      const res = await getMyStudents();
      setStudents(res.data.students || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a child');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for absence');
      return;
    }

    setSubmitting(true);
    try {
      await markChildAbsent({
        student_id: selectedStudent.id,
        reason: reason.trim(),
      });
      setSuccess(true);
      setTimeout(() => router.back(), 2000);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark child absent');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a6fa5" />
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Absence Reported!</Text>
        <Text style={styles.successSub}>
          Your child has been marked as absent for today.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mark Child Absent</Text>
        <View style={{ width: SCREEN_WIDTH < 350 ? scale(48) : scale(56) }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>
          Please select the child who will be absent today and provide a reason.
        </Text>

        {/* Student selection */}
        <Text style={styles.label}>Select Child</Text>
        {students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No children registered. Add a child first.</Text>
          </View>
        ) : (
          students.map((student) => (
            <TouchableOpacity
              key={student.id}
              style={[
                styles.studentCard,
                selectedStudent?.id === student.id && styles.selectedCard,
              ]}
              onPress={() => setSelectedStudent(student)}
            >
              <View style={styles.radioCircle}>
                {selectedStudent?.id === student.id && <View style={styles.radioFilled} />}
              </View>
              <View>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentSchool}>{student.school_name}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Reason input */}
        <Text style={styles.label}>Reason for Absence</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. Sick, family event, etc."
          placeholderTextColor="#a0aec0"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (!selectedStudent || !reason.trim() || submitting) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!selectedStudent || !reason.trim() || submitting}
        >
          <Text style={styles.submitText}>
            {submitting ? 'Submitting...' : 'Submit Absence'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8f9fa', paddingHorizontal: scale(32),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#4a6fa5', paddingTop: verticalScale(56), paddingHorizontal: scale(16), paddingBottom: verticalScale(16),
  },
  title: { color: '#fff', fontSize: dynamicFontSize(16, 17, 18), fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700' },
  content: { padding: scale(16) },
  instruction: {
    fontSize: dynamicFontSize(12, 13, 14), color: '#718096', lineHeight: 20,
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: dynamicFontSize(12, 13, 14), fontWeight: '700', color: '#2d3748',
    marginBottom: verticalScale(8), marginTop: verticalScale(8),
  },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: moderateScale(14),
    padding: scale(14), marginBottom: verticalScale(10),
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  selectedCard: {
    borderWidth: 2, borderColor: '#4a6fa5',
    backgroundColor: '#f0f5ff',
  },
  radioCircle: {
    width: scale(22), height: verticalScale(22), borderRadius: moderateScale(11),
    borderWidth: 2, borderColor: '#cbd5e0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: scale(12),
  },
  radioFilled: {
    width: scale(12), height: verticalScale(12), borderRadius: moderateScale(6),
    backgroundColor: '#4a6fa5',
  },
  studentName: { fontSize: dynamicFontSize(14, 15, 16), fontWeight: '700', color: '#2d3748' },
  studentSchool: { fontSize: dynamicFontSize(10, 11, 12), color: '#718096', marginTop: verticalScale(2) },
  textArea: {
    backgroundColor: '#fff', borderRadius: moderateScale(12),
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: scale(14), fontSize: dynamicFontSize(13, 14, 15), color: '#2d3748',
    minHeight: 80, marginBottom: verticalScale(8),
  },
  submitButton: {
    backgroundColor: '#4a6fa5', borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14), alignItems: 'center',
    marginTop: verticalScale(20),
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: dynamicFontSize(14, 15, 16) },
  successEmoji: { fontSize: moderateScale(56), marginBottom: verticalScale(16) },
  successTitle: { fontSize: dynamicFontSize(18, 19, 20), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(8) },
  successSub: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096', textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: moderateScale(14), padding: scale(20),
    alignItems: 'center', marginBottom: verticalScale(12),
  },
  emptyText: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096' },
});