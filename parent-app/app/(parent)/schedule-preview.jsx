import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import { SOCKET_URL, getSchedulePreview, getParentTripStatus } from '../../constants/api';

export default function SchedulePreview() {
  const [schedule, setSchedule] = useState([]);
  const [tripStatuses, setTripStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const socketRef = useRef(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const [scheduleRes, statusRes] = await Promise.allSettled([
        getSchedulePreview(),
        getParentTripStatus()
      ]);

      if (scheduleRes.status === 'fulfilled') {
        setSchedule(scheduleRes.value.data.schedule || []);
      }
      if (statusRes.status === 'fulfilled') {
        setTripStatuses(statusRes.value.data?.trip_statuses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSchedule();
    } finally {
      setRefreshing(false);
    }
  }, [fetchSchedule]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    const refreshLiveData = () => {
      fetchSchedule();
    };

    socket.on('trip:reassignment_needed', refreshLiveData);
    socket.on('trip:reassigned', refreshLiveData);
    socket.on('driver:availability_changed', refreshLiveData);

    return () => {
      socket.off('trip:reassignment_needed', refreshLiveData);
      socket.off('trip:reassigned', refreshLiveData);
      socket.off('driver:availability_changed', refreshLiveData);
      socket.disconnect();
    };
  }, [fetchSchedule]);

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

  const tripStatusCard = (() => {
    const [topStatus] = tripStatuses;

    if (!topStatus) {
      return {
        state: 'clear',
        title: 'Trip status is normal',
        message: 'Your children’s routes are currently running on schedule.',
        routeName: null,
        driverName: null,
        busPlate: null,
      };
    }

    const affectedStudents = topStatus.affected_students || [];
    const childLabel = affectedStudents.length === 1
      ? '1 child affected'
      : `${affectedStudents.length} children affected`;

    if (topStatus.card_state === 'delayed') {
      return {
        state: 'delayed',
        title: 'Trip delayed',
        message: topStatus.reassignment_reason
          ? `${topStatus.route_name} is waiting for a replacement driver. ${childLabel}. Reason: ${topStatus.reassignment_reason}.`
          : `${topStatus.route_name} is waiting for a replacement driver. ${childLabel}.`,
        routeName: topStatus.route_name,
        driverName: topStatus.driver_name,
        busPlate: topStatus.plate_number,
      };
    }

    if (topStatus.card_state === 'reassigned') {
      return {
        state: 'reassigned',
        title: 'Driver reassigned',
        message: topStatus.new_driver_name
          ? `${topStatus.route_name} now has ${topStatus.new_driver_name} assigned. ${childLabel}.`
          : `${topStatus.route_name} has been reassigned and is back in motion. ${childLabel}.`,
        routeName: topStatus.route_name,
        driverName: topStatus.new_driver_name || topStatus.driver_name,
        busPlate: topStatus.plate_number,
      };
    }

    return {
      state: 'clear',
      title: 'Trip back on schedule',
      message: `${topStatus.route_name} is running normally again. ${childLabel}.`,
      routeName: topStatus.route_name,
      driverName: topStatus.driver_name,
      busPlate: topStatus.plate_number,
    };
  })();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Children’s Schedule</Text>
      </View>

      <View style={[
        styles.tripAlertCard,
        tripStatusCard.state === 'delayed'
          ? styles.tripAlertDelayed
          : tripStatusCard.state === 'reassigned'
            ? styles.tripAlertReassigned
            : styles.tripAlertNormal
      ]}>
        <Text style={styles.tripAlertLabel}>Live Trip Status</Text>
        <Text style={styles.tripAlertTitle}>{tripStatusCard.title}</Text>
        <Text style={styles.tripAlertMessage}>{tripStatusCard.message}</Text>
        <View style={styles.tripAlertMetaRow}>
          {!!tripStatusCard.routeName && (
            <Text style={styles.tripAlertMeta} numberOfLines={1}>Route: {tripStatusCard.routeName}</Text>
          )}
          {!!tripStatusCard.busPlate && (
            <Text style={styles.tripAlertMeta} numberOfLines={1}>Bus: {tripStatusCard.busPlate}</Text>
          )}
        </View>
        {!!tripStatusCard.driverName && (
          <Text style={styles.tripAlertMeta} numberOfLines={1}>Driver: {tripStatusCard.driverName}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4a6fa5" />
        </View>
      ) : schedule.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No upcoming trips for your children</Text>
          <Text style={styles.emptySub}>Routes appear here only when they include one of your children’s pickup points.</Text>
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
  tripAlertCard: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(10),
    borderRadius: verticalScale(16),
    padding: verticalScale(16),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: verticalScale(8),
    elevation: 2,
  },
  tripAlertNormal: {
    borderLeftWidth: scale(5),
    borderLeftColor: '#16a34a',
  },
  tripAlertDelayed: {
    borderLeftWidth: scale(5),
    borderLeftColor: '#f59e0b',
  },
  tripAlertReassigned: {
    borderLeftWidth: scale(5),
    borderLeftColor: '#2563eb',
  },
  tripAlertLabel: {
    fontSize: dynamicFontSize(10, 11, 12),
    fontWeight: '800',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(4),
  },
  tripAlertTitle: {
    fontSize: dynamicFontSize(16, 17, 18),
    fontWeight: '800',
    color: '#1f2937',
  },
  tripAlertMessage: {
    fontSize: dynamicFontSize(12, 13, 14),
    color: '#4a5568',
    marginTop: verticalScale(6),
    lineHeight: moderateScale(18),
  },
  tripAlertMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
    marginTop: verticalScale(10),
  },
  tripAlertMeta: {
    fontSize: dynamicFontSize(11, 12, 13),
    color: '#2d3748',
    fontWeight: '600',
  },
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
