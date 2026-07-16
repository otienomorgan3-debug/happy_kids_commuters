import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPaymentSummary, getPaymentHistory, initiateStkPush } from '../../constants/api';

export default function Payments() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        getPaymentSummary(),
        getPaymentHistory()
      ]);
      setSummary(summaryRes.data.summary);
      setHistory(historyRes.data.payments || []);
    } catch (err) {
      console.error('Failed to load payment data:', err);
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

  const handleMakePayment = async (student) => {
    const amount = student.outstanding_balance || student.transport_fee;
    
    if (!amount || amount <= 0) {
      Alert.alert('Info', 'No outstanding balance for this student');
      return;
    }

    Alert.alert(
      'Confirm Payment',
      `Pay KES ${amount.toFixed(2)} for ${student.name}?\n\nYou will receive an STK push on your phone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setProcessingPayment(true);
            try {
              const res = await initiateStkPush({
                student_id: student.id,
                amount: amount,
                phone_number: '', // Will use default from profile
                description: `Transport fee for ${student.name}`
              });
              
              Alert.alert(
                'STK Push Sent!',
                res.data.message || 'Check your phone for M-Pesa prompt',
                [{ text: 'OK', onPress: () => fetchData() }]
              );
            } catch (err) {
              Alert.alert(
                'Payment Failed',
                err.response?.data?.message || 'Failed to initiate payment. Please try again.'
              );
            } finally {
              setProcessingPayment(false);
            }
          }
        }
      ]
    );
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32
  },
  loadingText: { fontSize: 14, color: '#718096' },
  header: {
    backgroundColor: '#4a6fa5',
    padding: 24,
    paddingTop: 56,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14, color: '#bee3f8'
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: 18, fontWeight: 'bold', color: '#2d3748', marginTop: 8
  },
  summaryLabel: {
    fontSize: 12, color: '#718096', marginTop: 4
  },
  summaryCount: {
    fontSize: 11, color: '#a0aec0', marginTop: 2
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: 'bold', color: '#2d3748', marginBottom: 12
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center'
  },
  avatarText: {
    fontSize: 20, fontWeight: 'bold', color: '#4a6fa5'
  },
  studentInfo: {
    marginLeft: 12, flex: 1
  },
  studentName: {
    fontSize: 16, fontWeight: 'bold', color: '#2d3748'
  },
  schoolName: {
    fontSize: 13, color: '#718096', marginTop: 2
  },
  feeDetails: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0'
  },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6
  },
  feeLabel: {
    fontSize: 13, color: '#718096'
  },
  feeValue: {
    fontSize: 13, fontWeight: '600', color: '#2d3748'
  },
  payButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  payButtonText: {
    color: '#fff', fontWeight: '600', fontSize: 14
  },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8f3dc',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  clearedText: {
    color: '#2d6a4f', fontWeight: '600', fontSize: 13
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4a6fa5',
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4
  },
  statusIcon: {
    fontSize: 12
  },
  statusText: {
    fontSize: 11, fontWeight: '600', color: '#2d3748'
  },
  historyDate: {
    fontSize: 11, color: '#a0aec0'
  },
  historyDetails: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6
  },
  historyStudent: {
    fontSize: 14, fontWeight: '600', color: '#2d3748'
  },
  historyAmount: {
    fontSize: 15, fontWeight: 'bold', color: '#2d6a4f'
  },
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4
  },
  receiptText: {
    fontSize: 11, color: '#718096', fontFamily: 'monospace'
  },
  transactionDate: {
    fontSize: 11, color: '#a0aec0', marginTop: 4
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: 48, marginBottom: 12
  },
  emptyText: {
    fontSize: 14, color: '#718096', textAlign: 'center'
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#ebf4ff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    gap: 12,
  },
  infoContent: {
    flex: 1
  },
  infoTitle: {
    fontSize: 14, fontWeight: '600', color: '#4a6fa5', marginBottom: 6
  },
  infoText: {
    fontSize: 12, color: '#718096', lineHeight: 18
  },
});