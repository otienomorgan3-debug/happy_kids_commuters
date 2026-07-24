import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
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
        <View style={{ width: SCREEN_WIDTH < 350 ? scale(48) : scale(56) }} />
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
    backgroundColor: '#f8f9fa', paddingHorizontal: scale(32),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#4a6fa5', paddingTop: verticalScale(56), paddingHorizontal: scale(16), paddingBottom: verticalScale(16),
  },
  title: { color: '#fff', fontSize: dynamicFontSize(16, 17, 18), fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700' },
  backLink: { color: '#4a6fa5', fontSize: dynamicFontSize(12, 13, 14), fontWeight: '700', marginBottom: verticalScale(12) },
  content: { padding: scale(16) },
  instruction: {
    fontSize: dynamicFontSize(12, 13, 14), color: '#718096', lineHeight: 20, marginBottom: verticalScale(20),
  },
  label: {
    fontSize: dynamicFontSize(12, 13, 14), fontWeight: '700', color: '#2d3748',
    marginBottom: verticalScale(8), marginTop: verticalScale(12),
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
  currentPickup: { fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0', marginTop: verticalScale(4) },
  input: {
    backgroundColor: '#fff', borderRadius: moderateScale(12),
    borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: scale(14), paddingVertical: verticalScale(12),
    fontSize: dynamicFontSize(13, 14, 15), color: '#2d3748',
  },
  textArea: {
    backgroundColor: '#fff', borderRadius: moderateScale(12),
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: scale(14), fontSize: dynamicFontSize(13, 14, 15), color: '#2d3748',
    minHeight: 60, marginBottom: verticalScale(8),
  },
  submitButton: {
    backgroundColor: '#4a6fa5', borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14), alignItems: 'center',
    marginTop: verticalScale(20),
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: dynamicFontSize(14, 15, 16) },
  historyLink: { marginTop: verticalScale(16), alignItems: 'center' },
  historyLinkText: { color: '#4a6fa5', fontSize: dynamicFontSize(12, 13, 14), fontWeight: '600' },
  successEmoji: { fontSize: moderateScale(56), marginBottom: verticalScale(16) },
  successTitle: { fontSize: dynamicFontSize(18, 19, 20), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(8) },
  successSub: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096', textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: moderateScale(14), padding: scale(20),
    alignItems: 'center', marginBottom: verticalScale(12),
  },
  emptyText: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096' },
  sectionTitle: { fontSize: dynamicFontSize(15, 16, 17), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(12) },
  requestCard: {
    backgroundColor: '#fff', borderRadius: moderateScale(14), padding: scale(14),
    marginBottom: verticalScale(10),
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: verticalScale(8),
  },
  requestStudent: { fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700', color: '#2d3748' },
  statusPill: { borderRadius: moderateScale(999), paddingHorizontal: scale(10), paddingVertical: verticalScale(4) },
  statusText: { fontSize: dynamicFontSize(10, 11, 12), fontWeight: '800', textTransform: 'uppercase' },
  requestDetail: { fontSize: dynamicFontSize(11, 12, 13), color: '#4a5568', marginBottom: verticalScale(4) },
  requestDate: { fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0', marginTop: verticalScale(4) },
});