import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getMyStudents, requestPickupChange, getPickupChangeRequests } from '../../constants/api';

export default function ChangePickupScreen() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newPickup, setNewPickup] = useState('');
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingRequests, setExistingRequests] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [studentsRes, requestsRes] = await Promise.all([
        getMyStudents(),
        getPickupChangeRequests(),
      ]);
      setStudents(studentsRes.data.students || []);
      setExistingRequests(requestsRes.data.requests || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a child');
      return;
    }
    if (!newPickup.trim()) {
      Alert.alert('Error', 'Please enter the new pickup location');
      return;
    }

    setSubmitting(true);
    try {
      await requestPickupChange({
        student_id: selectedStudent.id,
        new_pickup_location: newPickup.trim(),
        reason: reason.trim() || undefined,
        effective_date: effectiveDate.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.back(), 2500);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit pickup change');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { backgroundColor: '#e6fffa', color: '#276749' };
      case 'rejected': return { backgroundColor: '#fff5f5', color: '#c53030' };
      default: return { backgroundColor: '#fff7e6', color: '#b7791f' };
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
        <Text style={styles.successEmoji}>📍</Text>
        <Text style={styles.successTitle}>Request Submitted!</Text>
        <Text style={styles.successSub}>
          Your pickup change request has been submitted and is awaiting admin approval.
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
        <Text style={styles.title}>Change Pickup Point</Text>
        <View style={{ width: 56 }} />
      </View>

      <View style={styles.content}>
        {!showHistory ? (
          <>
            <Text style={styles.instruction}>
              Request to change the pickup location for your child. This will need admin approval.
            </Text>

            {/* Student selection */}
            <Text style={styles.label}>Select Child</Text>
            {students.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No children registered.</Text>
              </View>
            ) : (
              students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={[
                    styles.studentCard,
                    selectedStudent?.id === student.id && styles.selectedCard,
                  ]}
                  onPress={() => {
                    setSelectedStudent(student);
                    setNewPickup(student.pickup_location || '');
                  }}
                >
                  <View style={styles.radioCircle}>
                    {selectedStudent?.id === student.id && <View style={styles.radioFilled} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentSchool}>{student.school_name}</Text>
                    <Text style={styles.currentPickup}>
                      Current: {student.pickup_location || 'Not set'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* New pickup location */}
            <Text style={styles.label}>New Pickup Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter new pickup address"
              placeholderTextColor="#a0aec0"
              value={newPickup}
              onChangeText={setNewPickup}
            />

            {/* Effective date (optional) */}
            <Text style={styles.label}>Effective Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-07-15"
              placeholderTextColor="#a0aec0"
              value={effectiveDate}
              onChangeText={setEffectiveDate}
            />

            {/* Reason (optional) */}
            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Why are you requesting this change?"
              placeholderTextColor="#a0aec0"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, (!selectedStudent || !newPickup.trim() || submitting) && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!selectedStudent || !newPickup.trim() || submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>

            {/* View history link */}
            {existingRequests.length > 0 && (
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => setShowHistory(true)}
              >
                <Text style={styles.historyLinkText}>
                  View previous requests ({existingRequests.length})
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Request History */
          <>
            <TouchableOpacity onPress={() => setShowHistory(false)}>
              <Text style={styles.backLink}>← Back to form</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Previous Requests</Text>
            {existingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No previous requests</Text>
              </View>
            ) : (
              existingRequests.map((req) => {
                const statusStyle = getStatusStyle(req.status);
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestStudent}>{req.student_name}</Text>
                      <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                          {req.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.requestDetail}>
                      Old: {req.old_pickup_location}
                    </Text>
                    <Text style={styles.requestDetail}>
                      New: {req.new_pickup_location}
                    </Text>
                    {req.effective_date && (
                      <Text style={styles.requestDetail}>
                        Effective: {formatDate(req.effective_date)}
                      </Text>
                    )}
                    {req.reason && (
                      <Text style={styles.requestDetail}>Reason: {req.reason}</Text>
                    )}
                    <Text style={styles.requestDate}>
                      Submitted: {formatDate(req.created_at)}
                    </Text>
                  </View>
                );
              })
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f8f9fa', paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#4a6fa5', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: 15, fontWeight: '700' },
  backLink: { color: '#4a6fa5', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  content: { padding: 16 },
  instruction: {
    fontSize: 14, color: '#718096', lineHeight: 20, marginBottom: 20,
  },
  label: {
    fontSize: 14, fontWeight: '700', color: '#2d3748',
    marginBottom: 8, marginTop: 12,
  },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  selectedCard: {
    borderWidth: 2, borderColor: '#4a6fa5',
    backgroundColor: '#f0f5ff',
  },
  radioCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#cbd5e0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  radioFilled: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4a6fa5',
  },
  studentName: { fontSize: 16, fontWeight: '700', color: '#2d3748' },
  studentSchool: { fontSize: 12, color: '#718096', marginTop: 2 },
  currentPickup: { fontSize: 12, color: '#a0aec0', marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#2d3748',
  },
  textArea: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 14, fontSize: 14, color: '#2d3748',
    minHeight: 60, marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#4a6fa5', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 20,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  historyLink: { marginTop: 16, alignItems: 'center' },
  historyLinkText: { color: '#4a6fa5', fontSize: 14, fontWeight: '600' },
  successEmoji: { fontSize: 56, marginBottom: 16 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#2d3748', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#718096', textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 12,
  },
  emptyText: { fontSize: 14, color: '#718096' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#2d3748', marginBottom: 12 },
  requestCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  requestStudent: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  requestDetail: { fontSize: 13, color: '#4a5568', marginBottom: 4 },
  requestDate: { fontSize: 11, color: '#a0aec0', marginTop: 4 },
});