import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPaymentReceipt } from '../../constants/api';

export default function PaymentReceipt() {
  const { paymentId } = useLocalSearchParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadReceipt = useCallback(async () => {
    try {
      const res = await getPaymentReceipt(paymentId);
      setReceipt(res.data.receipt);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    loadReceipt();
  }, [loadReceipt]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a6fa5" />
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Receipt not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const details = [
    { label: 'Student', value: receipt.student_name || '—' },
    { label: 'Parent', value: receipt.parent_name || '—' },
    { label: 'Phone', value: receipt.phone_number || receipt.parent_phone || '—' },
    { label: 'Amount', value: `KES ${Number(receipt.amount || 0).toFixed(2)}` },
    { label: 'Receipt No.', value: receipt.mpesa_receipt || 'Pending' },
    { label: 'Account Ref.', value: receipt.account_reference || '—' },
    { label: 'Status', value: receipt.status || '—' },
    { label: 'Balance after', value: `KES ${Number(receipt.balance_after || 0).toFixed(2)}` },
    { label: 'Transaction date', value: receipt.transaction_date ? new Date(receipt.transaction_date).toLocaleString() : '—' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Receipt</Text>
        <View style={{ width: 56 }} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Confirmed payment</Text>
        <Text style={styles.heroAmount}>KES {Number(receipt.amount || 0).toFixed(2)}</Text>
        <Text style={styles.heroSub}>
          This receipt was generated from the callback returned by Safaricom Daraja.
        </Text>
      </View>

      <View style={styles.card}>
        {details.map((item) => (
          <View key={item.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Callback message</Text>
        <Text style={styles.paragraph}>{receipt.result_desc || 'Payment processed successfully.'}</Text>
        <Text style={styles.smallText}>
          Reference ID: {receipt.checkout_request_id || '—'}
        </Text>
      </View>
    </ScrollView>
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
  hero: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroLabel: { fontSize: 12, fontWeight: '800', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: 1 },
  heroAmount: { fontSize: 30, fontWeight: '900', color: '#2d3748', marginTop: 8 },
  heroSub: { fontSize: 13, color: '#718096', textAlign: 'center', marginTop: 10, lineHeight: 19 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2d3748', marginBottom: 10 },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 10,
  },
  detailLabel: { fontSize: 12, color: '#718096' },
  detailValue: { fontSize: 15, color: '#2d3748', fontWeight: '700', marginTop: 4 },
  paragraph: { fontSize: 14, color: '#2d3748', lineHeight: 22 },
  smallText: { fontSize: 12, color: '#718096', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#2d3748', marginBottom: 16 },
  backButton: {
    backgroundColor: '#4a6fa5',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: { color: '#fff', fontWeight: '800' },
});
