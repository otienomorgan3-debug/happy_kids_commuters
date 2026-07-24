import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPaymentData, initiateMpesaPayment } from '../../constants/api';

export default function Payments() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await getPaymentData();
      setSummary(res.data.data.summary);
      setHistory(res.data.data.payments || []);
    } catch (err) {
      console.error('Failed to load payment data:', err);
      setError(err.response?.data?.message || 'Failed to load payment data');
      setSummary(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleMakePayment = (student) => {
    const amount = Number(student.outstanding_balance || student.transport_fee || 0);

    if (!amount || amount <= 0) {
      Alert.alert('Info', 'No outstanding balance for this student');
      return;
    }

    // Store selected student and show phone number modal
    setSelectedStudent(student);
    setPhoneNumber('');
    setShowPhoneModal(true);
  };

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      Alert.alert('Invalid', 'Please enter a valid phone number (e.g., 254712345678)');
      return;
    }

    setShowPhoneModal(false);
    const amount = Number(selectedStudent.outstanding_balance || selectedStudent.transport_fee || 0);
    await processPayment(selectedStudent, amount, phoneNumber.trim());
  };

  const processPayment = async (student, amount, phoneNumber) => {
    setProcessingPayment(true);
    try {
      const res = await initiateMpesaPayment({
        student_id: student.id,
        amount: amount,
        phone_number: phoneNumber,
        description: `Transport fee for ${student.name}`
      });

      Alert.alert(
        'STK Push Sent! ✅',
        res.data.message || 'Check your phone for M-Pesa prompt and enter your PIN.',
        [{ text: 'OK', onPress: () => fetchData() }]
      );
    } catch (err) {
      Alert.alert(
        'Payment Failed ❌',
        err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#d8f3dc';
      case 'pending': return '#fffbeb';
      case 'failed': return '#ffe4e4';
      default: return '#f5f5f5';
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case 'paid': return '✅';
      case 'pending': return '⏳';
      case 'failed': return '❌';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Unable to load payment data'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalOutstanding = summary?.students?.reduce(
    (sum, s) => sum + Number(s.outstanding_balance || 0), 0
  ) || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments & Fees</Text>
        <Text style={styles.headerSubtitle}>Manage your childs transport fees</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#e8f5e9' }]}>
          <MaterialCommunityIcons name="check-circle" size={32} color="#2d6a4f" />
          <Text style={styles.summaryAmount}>KES {summary?.total_paid?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryCount}>{summary?.paid_count || 0} payments</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#ffe4e4' }]}>
          <MaterialCommunityIcons name="alert-circle" size={32} color="#c53030" />
          <Text style={styles.summaryAmount}>KES {totalOutstanding.toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text style={styles.summaryCount}>{summary?.students?.length || 0} children</Text>
        </View>
      </View>

      {/* Children Payment Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transport Fees</Text>
        {summary?.students?.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👶</Text>
            <Text style={styles.emptyText}>No children added yet</Text>
          </View>
        ) : (
          summary.students.map(student => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.schoolName}>{student.school_name}</Text>
                </View>
              </View>

              <View style={styles.feeDetails}>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Transport Fee:</Text>
                  <Text style={styles.feeValue}>KES {Number(student.transport_fee || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Outstanding:</Text>
                  <Text style={[
                    styles.feeValue,
                    { color: student.outstanding_balance > 0 ? '#c53030' : '#2d6a4f' }
                  ]}>
                    KES {Number(student.outstanding_balance || 0).toFixed(2)}
                  </Text>
                </View>
                {student.last_payment_at && (
                  <View style={styles.feeRow}>
                    <Text style={styles.feeLabel}>Last Payment:</Text>
                    <Text style={styles.feeValue}>
                      {new Date(student.last_payment_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {student.outstanding_balance > 0 && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handleMakePayment(student)}
                  disabled={processingPayment}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="credit-card" size={20} color="#fff" />
                  <Text style={styles.payButtonText}>
                    Pay KES {Number(student.outstanding_balance).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              )}

              {student.outstanding_balance === 0 && (
                <View style={styles.clearedBadge}>
                  <MaterialCommunityIcons name="check" size={16} color="#2d6a4f" />
                  <Text style={styles.clearedText}>All fees cleared</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Payment History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No payment history yet</Text>
          </View>
        ) : (
          history.map(payment => (
            <View key={payment.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getPaymentStatusColor(payment.status) }
                ]}>
                  <Text style={styles.statusIcon}>
                    {getPaymentStatusIcon(payment.status)}
                  </Text>
                  <Text style={styles.statusText}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Text>
                </View>
                <Text style={styles.historyDate}>
                  {new Date(payment.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.historyDetails}>
                <Text style={styles.historyStudent}>{payment.student_name}</Text>
                <Text style={styles.historyAmount}>KES {Number(payment.amount).toFixed(2)}</Text>
              </View>

              {payment.mpesa_receipt && (
                <View style={styles.receiptRow}>
                  <MaterialCommunityIcons name="receipt" size={14} color="#718096" />
                  <Text style={styles.receiptText}>{payment.mpesa_receipt}</Text>
                </View>
              )}

              {payment.transaction_date && (
                <Text style={styles.transactionDate}>
                  Paid on {new Date(payment.transaction_date).toLocaleString()}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information" size={24} color="#4a6fa5" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Payment Information</Text>
          <Text style={styles.infoText}>
            • Payments are processed via M-Pesa STK Push\n• You will receive a prompt on your phone\n• Payments are reflected immediately\n• Contact admin for any payment issues
          </Text>
        </View>
      </View>

      {/* Phone Number Modal */}
      <Modal
        visible={showPhoneModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhoneModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Phone Number</Text>
            <Text style={styles.modalSubtitle}>
              {selectedStudent ? `Paying KES ${Number(selectedStudent.outstanding_balance || selectedStudent.transport_fee || 0).toFixed(2)} for ${selectedStudent.name}` : ''}
            </Text>
            
            <TextInput
              style={styles.phoneInput}
              placeholder="e.g., 254712345678"
              placeholderTextColor="#a0aec0"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              maxLength={13}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPhoneModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.payModalButton]}
                onPress={handlePhoneSubmit}
                disabled={processingPayment}
              >
                <Text style={styles.payModalButtonText}>
                  {processingPayment ? 'Processing...' : 'Pay Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(32)
  },
  loadingText: { fontSize: moderateScale(14), color: '#718096' },
  header: {
    backgroundColor: '#4a6fa5',
    padding: scale(24),
    paddingTop: verticalScale(56),
    paddingBottom: verticalScale(32),
  },
  headerTitle: {
    fontSize: dynamicFontSize(20, 22, 24), fontWeight: 'bold', color: '#fff', marginBottom: verticalScale(4)
  },
  headerSubtitle: {
    fontSize: dynamicFontSize(12, 13, 14), color: '#bee3f8'
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: verticalScale(-20),
    gap: verticalScale(12),
  },
  summaryCard: {
    flex: 1, minWidth: SCREEN_WIDTH < 350 ? scale(140) : scale(160),
    borderRadius: moderateScale(16),
    padding: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: dynamicFontSize(16, 17, 18), fontWeight: 'bold', color: '#2d3748', marginTop: verticalScale(8)
  },
  summaryLabel: {
    fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(4)
  },
  summaryCount: {
    fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0', marginTop: verticalScale(2)
  },
  section: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(24),
  },
  sectionTitle: {
    fontSize: moderateScale(17), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(12)
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'visible',
  },
  studentHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(12)
  },
  avatar: {
    width: scale(48), height: verticalScale(48), borderRadius: moderateScale(24),
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center'
  },
  avatarText: {
    fontSize: moderateScale(20), fontWeight: 'bold', color: '#4a6fa5'
  },
  studentInfo: {
    marginLeft: scale(12), flex: 1
  },
  studentName: {
    fontSize: dynamicFontSize(14, 15, 16), fontWeight: 'bold', color: '#2d3748'
  },
  schoolName: {
    fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(2)
  },
  feeDetails: {
    marginTop: verticalScale(12), paddingTop: verticalScale(12), borderTopWidth: 1, borderTopColor: '#e2e8f0'
  },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6)
  },
  feeLabel: {
    fontSize: dynamicFontSize(11, 12, 13), color: '#718096'
  },
  feeValue: {
    fontSize: dynamicFontSize(11, 12, 13), fontWeight: '600', color: '#2d3748'
  },
  payButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    paddingHorizontal: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
    gap: verticalScale(8),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  payButtonText: {
    color: '#fff', fontWeight: '700', fontSize: dynamicFontSize(13, 14, 15)
  },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8f3dc',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(12),
    gap: verticalScale(6),
  },
  clearedText: {
    color: '#2d6a4f', fontWeight: '600', fontSize: dynamicFontSize(11, 12, 13)
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(12),
    padding: scale(14),
    marginBottom: verticalScale(10),
    borderLeftWidth: 4,
    borderLeftColor: '#4a6fa5',
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(8)
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: moderateScale(8),
    paddingHorizontal: scale(10), paddingVertical: verticalScale(4), gap: verticalScale(4)
  },
  statusIcon: {
    fontSize: moderateScale(12)
  },
  statusText: {
    fontSize: dynamicFontSize(10, 11, 12), fontWeight: '600', color: '#2d3748'
  },
  historyDate: {
    fontSize: moderateScale(11), color: '#a0aec0'
  },
  historyDetails: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(6)
  },
  historyStudent: {
    fontSize: dynamicFontSize(13, 14, 15), fontWeight: '600', color: '#2d3748'
  },
  historyAmount: {
    fontSize: dynamicFontSize(13, 14, 15), fontWeight: 'bold', color: '#2d6a4f'
  },
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: verticalScale(4), marginTop: verticalScale(4)
  },
  receiptText: {
    fontSize: dynamicFontSize(10, 11, 12), color: '#718096', fontFamily: 'monospace'
  },
  transactionDate: {
    fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0', marginTop: verticalScale(4)
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    padding: scale(32),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: moderateScale(48), marginBottom: verticalScale(12)
  },
  emptyText: {
    fontSize: moderateScale(14), color: '#718096', textAlign: 'center'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ebf4ff',
    borderRadius: moderateScale(12),
    padding: scale(16),
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(32),
    gap: verticalScale(12),
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: dynamicFontSize(12, 13, 14), fontWeight: '600', color: '#4a6fa5', marginBottom: verticalScale(6)
  },
  infoText: {
    fontSize: dynamicFontSize(11, 12, 13), color: '#718096', lineHeight: 18
  },
  errorText: {
    fontSize: moderateScale(14), color: '#c53030', textAlign: 'center', marginBottom: verticalScale(16)
  },
  retryButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12)
  },
  retryButtonText: {
    color: '#fff', fontWeight: '600', fontSize: dynamicFontSize(12, 13, 14)
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: dynamicFontSize(18, 19, 20),
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: verticalScale(8),
  },
  modalSubtitle: {
    fontSize: dynamicFontSize(13, 14, 15),
    color: '#718096',
    marginBottom: verticalScale(20),
  },
  phoneInput: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: dynamicFontSize(16, 17, 18),
    color: '#2d3748',
    marginBottom: verticalScale(20),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: verticalScale(12),
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#2d3748',
    fontWeight: '600',
    fontSize: dynamicFontSize(14, 15, 16),
  },
  payModalButton: {
    backgroundColor: '#2d6a4f',
  },
  payModalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: dynamicFontSize(14, 15, 16),
  },
});
