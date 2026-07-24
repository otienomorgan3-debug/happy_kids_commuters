import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { getSchedulePreview } from '../../constants/api';

export default function SchedulePreview() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await getSchedulePreview();
      setSchedule(res.data.schedule || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  }, [fetchSchedule]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
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
        <Text style={styles.title}>Schedule Preview</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6fa5" />
        </View>
      ) : schedule.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No upcoming trips</Text>
          <Text style={styles.emptySub}>Schedule preview will appear here when trips are planned.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {schedule.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.routeName}>{item.route_name}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'active' ? '#16a34a' : '#d97706' }]}>
                    {item.status === 'active' ? 'Active' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.detail}>🚌 Bus: {item.plate_number}</Text>
              <Text style={styles.detail}>👨‍✈️ Driver: {item.driver_name}</Text>
              <Text style={styles.detail}>👶 Child: {item.student_name}</Text>
              <Text style={styles.detail}>📍 Pickup: {item.pickup_location}</Text>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>🕐 {formatTime(item.start_time)}</Text>
                {item.end_time && <Text style={styles.timeText}>→ {formatTime(item.end_time)}</Text>}
              </View>
              {item.estimated_time && (
                <Text style={styles.detail}>⏱️ Est. {item.estimated_time} min</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: verticalScale(12),
    padding: scale(24), paddingTop: verticalScale(56), backgroundColor: '#4a6fa5'
  },
  backButton: { color: '#fff', fontSize: dynamicFontSize(14, 15, 16), fontWeight: '600' },
  title: { color: '#fff', fontSize: dynamicFontSize(20, 21, 22), fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(32) },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: moderateScale(16), padding: scale(32),
    marginHorizontal: scale(16), alignItems: 'center', marginTop: verticalScale(32),
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1
  },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  emptyTitle: { fontSize: dynamicFontSize(14, 15, 16), fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(4), textAlign: 'center' },
  list: { padding: scale(16), gap: verticalScale(12) },
  card: {
    backgroundColor: '#fff', borderRadius: moderateScale(16), padding: scale(16),
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(10)
  },
  routeName: { fontSize: dynamicFontSize(14, 15, 16), fontWeight: 'bold', color: '#2d3748', flex: 1 },
  badge: { paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: moderateScale(999) },
  badgeText: { fontSize: dynamicFontSize(10, 11, 12), fontWeight: '700' },
  detail: { fontSize: dynamicFontSize(11, 12, 13), color: '#4a5568', marginBottom: verticalScale(4) },
  timeRow: { flexDirection: 'row', gap: verticalScale(8), marginTop: verticalScale(8) },
  timeText: { fontSize: dynamicFontSize(11, 12, 13), fontWeight: '600', color: '#2d3748' },
});
