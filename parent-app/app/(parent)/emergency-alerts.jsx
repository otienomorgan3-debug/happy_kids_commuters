import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getEmergencyAlerts } from '../../constants/api';

export default function EmergencyAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await getEmergencyAlerts();
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#fee2e2';
      case 'resolved': return '#dcfce7';
      default: return '#f3f4f6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return '🔴 Active';
      case 'resolved': return '🟢 Resolved';
      default: return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergency Alerts</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>No emergency alerts</Text>
          <Text style={styles.emptySub}>All clear! There are no active emergencies.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {alerts.map(alert => (
            <View key={alert.id} style={[styles.alertCard, { backgroundColor: getStatusColor(alert.status) }]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>
                  🚨 Bus {alert.plate_number} — {alert.route_name}
                </Text>
                <Text style={[styles.statusBadge, { color: alert.status === 'active' ? '#dc2626' : '#16a34a' }]}>
                  {getStatusText(alert.status)}
                </Text>
              </View>
              <Text style={styles.alertDetail}>Driver: {alert.driver_name}</Text>
              <Text style={styles.alertDetail}>Location: {alert.location}</Text>
              {alert.status === 'active' && (
                <TouchableOpacity style={styles.callAction}>
                  <Text style={styles.callActionText}>📞 Call School</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 24, paddingTop: 56, backgroundColor: '#ef4444'
  },
  backButton: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    marginHorizontal: 16, alignItems: 'center', marginTop: 32,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 4, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  alertCard: {
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  alertHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
  },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748', flex: 1 },
  statusBadge: { fontSize: 12, fontWeight: '700' },
  alertDetail: { fontSize: 13, color: '#4a5568', marginBottom: 4 },
  callAction: {
    marginTop: 12, backgroundColor: '#ef4444', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center'
  },
  callActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
