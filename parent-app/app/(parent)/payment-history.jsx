import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getPaymentHistory } from '../../constants/api';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadPayments = useCallback(async () => {
    try {
      const res = await getPaymentHistory();
      setPayments(res.data.payments || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  }, [loadPayments]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid':
        return [styles.statusPill, styles.statusPaid];
      case 'failed':
        return [styles.statusPill, styles.statusFailed];
      default:
        return [styles.statusPill, styles.statusPending];
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a6fa5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment History</Text>
        <View style={{ width: 56 }} />
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptySub}>Your payment history will appear here after the first successful M-Pesa transaction.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{item.student_name || 'Unknown child'}</Text>
                <Text style={styles.meta}>Ref: {item.account_reference || 'N/A'}</Text>
              </View>
              <View style={getStatusStyle(item.status)}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.amount}>KES {Number(item.amount || 0).toFixed(2)}</Text>
              <Text style={styles.meta}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
              </Text>
            </View>

            <View style={styles.metaGrid}>
              <Text style={styles.metaItem}>Receipt: {item.mpesa_receipt || 'Pending'}</Text>
              <Text style={styles.metaItem}>Phone: {item.phone_number || '—'}</Text>
              <Text style={styles.metaItem}>Balance after: KES {Number(item.balance_after || 0).toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => router.push({ pathname: '/(parent)/payment-receipt', params: { paymentId: String(item.id) } })}
              disabled={item.status !== 'paid'}
            >
              <Text style={styles.receiptButtonText}>
                {item.status === 'paid' ? 'View receipt' : 'Awaiting confirmation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4a6fa5',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentName: { fontSize: 16, fontWeight: '800', color: '#2d3748' },
  amount: { fontSize: 18, fontWeight: '800', color: '#2d3748', marginTop: 10 },
  meta: { fontSize: 12, color: '#718096', marginTop: 4 },
  metaGrid: { marginTop: 12, gap: 4 },
  metaItem: { fontSize: 12, color: '#4a5568' },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPaid: { backgroundColor: '#e6fffa' },
  statusPending: { backgroundColor: '#fff7e6' },
  statusFailed: { backgroundColor: '#ffe8e8' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#2d3748', textTransform: 'uppercase' },
  receiptButton: {
    marginTop: 14,
    backgroundColor: '#ebf4ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  receiptButtonText: { color: '#4a6fa5', fontWeight: '800', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 6, textAlign: 'center' },
});
