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
import { getTransportHistory } from '../../constants/api';

export default function TransportHistory() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadHistory = useCallback(async () => {
    try {
      const res = await getTransportHistory();
      setTrips(res.data.trips || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return [styles.statusPill, styles.statusCompleted];
      case 'active':
        return [styles.statusPill, styles.statusActive];
      default:
        return [styles.statusPill, styles.statusPending];
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.title}>Transport History</Text>
        <View style={{ width: 56 }} />
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🚌</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>
              Student transport history will appear here after the first trip.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeName}>{item.route_name || 'Unknown Route'}</Text>
                <Text style={styles.driverName}>Driver: {item.driver_name || 'Not assigned'}</Text>
              </View>
              <View style={getStatusStyle(item.status)}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.tripDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {item.start_time ? formatDate(item.start_time) : '—'}
                </Text>
              </View>

              {item.start_time && item.end_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {Math.round(
                      (new Date(item.end_time) - new Date(item.start_time)) / 60000
                    )}{' '}
                    minutes
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bus:</Text>
                <Text style={styles.detailValue}>{item.plate_number || '—'}</Text>
              </View>
            </View>

            {item.attendance && item.attendance.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.attendanceTitle}>Attendance:</Text>
                {item.attendance.map((record) => (
                  <View key={record.id} style={styles.attendanceRow}>
                    <Text style={styles.attendanceText}>
                      {record.boarded_at ? '✓ Boarded' : '○ Not boarded'}
                    </Text>
                    <Text style={styles.attendanceTime}>
                      {record.boarded_at ? formatDate(record.boarded_at) : '—'}
                    </Text>
                  </View>
                ))}
              </>
            )}
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
  routeName: { fontSize: 16, fontWeight: '800', color: '#2d3748' },
  driverName: { fontSize: 13, color: '#718096', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  tripDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, color: '#718096', fontWeight: '600' },
  detailValue: { fontSize: 13, color: '#2d3748', fontWeight: '600' },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusCompleted: { backgroundColor: '#e6fffa' },
  statusActive: { backgroundColor: '#dbeafe' },
  statusPending: { backgroundColor: '#fff7e6' },
  statusText: { fontSize: 11, fontWeight: '800', color: '#2d3748', textTransform: 'uppercase' },
  attendanceTitle: { fontSize: 13, fontWeight: '700', color: '#4a5568', marginBottom: 8 },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  attendanceText: { fontSize: 13, color: '#2d3748' },
  attendanceTime: { fontSize: 12, color: '#718096' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 6, textAlign: 'center' },
});