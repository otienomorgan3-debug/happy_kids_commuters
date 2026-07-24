import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { getMe, getAssignedStudents, getRouteById, getRouteEta } from '../../constants/api';

export default function RouteGuidance() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [tripId, setTripId] = useState(null);
  const [route, setRoute] = useState(null);
  const [etaData, setEtaData] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [meRes, studentsRes] = await Promise.all([
        getMe(),
        getAssignedStudents(),
      ]);
      setUser(meRes.data.user);
      setStudents(studentsRes.data.students || []);
      setTripId(studentsRes.data.trip_id);

      if (studentsRes.data.trip_id && studentsRes.data.route_id) {
        const routeRes = await getRouteById(studentsRes.data.route_id);
        if (routeRes.data.route) {
          setRoute(routeRes.data.route);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadLocationAndEta = async () => {
      if (!route || !tripId) return;
      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCurrentLocation(location.coords);
        const etaRes = await getRouteEta(route.id, {
          bus_lat: location.coords.latitude,
          bus_lng: location.coords.longitude,
        });
        setEtaData(etaRes.data.stops_with_eta || []);
      } catch (error) {
        console.error('Failed to load ETA:', error.message);
      }
    };

    loadLocationAndEta();
  }, [route, tripId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getStopStatus = (stopOrder) => {
    const stopStudents = students.filter(s =>
      s.pickup_location?.toLowerCase().includes(stopOrder.toString()) ||
      s.dropoff_location?.toLowerCase().includes(stopOrder.toString())
    );
    const boardedCount = stopStudents.filter(s => s.status === 'boarded' || s.status === 'dropped').length;
    const totalCount = stopStudents.length;

    if (totalCount === 0) return { label: 'No students', color: '#e2e8f0', icon: '⬜' };
    if (boardedCount === totalCount) return { label: 'Done', color: '#d8f3dc', icon: '✅' };
    if (boardedCount > 0) return { label: `Partial (${boardedCount}/${totalCount})`, color: '#fffbeb', icon: '🟡' };
    return { label: `Waiting (${totalCount})`, color: '#f0f4f8', icon: '⏳' };
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Route Guidance</Text>
        <Text style={styles.subtitle}>{user?.name || 'Driver'}</Text>
      </View>

      {!tripId ? (
        <View style={styles.noTripCard}>
          <Text style={styles.noTripEmoji}>🗺️</Text>
          <Text style={styles.noTripTitle}>No Active Trip</Text>
          <Text style={styles.noTripSub}>
            Start a trip from the Home tab to see route guidance here.
          </Text>
          <TouchableOpacity style={styles.goHomeButton} onPress={() => router.push('/(driver)/home')}>
            <Text style={styles.goHomeText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Live Status Bar */}
          <View style={styles.liveBar}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Trip #{tripId} · GPS Active</Text>
          </View>

          {/* Route Overview */}
          {route && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{route.route_name}</Text>
              <Text style={styles.routeMeta}>
                Estimated time: {route.estimated_time || '—'} min · {route.stops?.length || 0} stops
              </Text>
            </View>
          )}

          {/* Students Summary */}
          {students.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Students ({students.length})
              </Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {students.filter(s => s.status === 'waiting').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Waiting</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: '#2d6a4f' }]}>
                    {students.filter(s => s.status === 'boarded').length}
                  </Text>
                  <Text style={styles.summaryLabel}>On Bus</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: '#4a6fa5' }]}>
                    {students.filter(s => s.status === 'dropped').length}
                  </Text>
                  <Text style={styles.summaryLabel}>Dropped</Text>
                </View>
              </View>
            </View>
          )}

          {/* Route Stops with Guidance */}
          {route?.stops && route.stops.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route Stops</Text>
              {route.stops.map((stop, idx) => {
                const status = getStopStatus(stop.stop_order);
                const eta = etaData[stop.id];
                return (
                  <View key={stop.id} style={styles.stopCard}>
                    <View style={styles.stopHeader}>
                      <View style={styles.stopNumber}>
                        <Text style={styles.stopNumberText}>
                          {stop.stop_order}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: scale(12) }}>
                        <Text style={styles.stopName}>{stop.stop_name}</Text>
                        {stop.location && (
                          <Text style={styles.stopLocation}>{stop.location}</Text>
                        )}
                      </View>
                      <View style={[styles.stopStatus, { backgroundColor: status.color }]}>
                        <Text style={styles.stopStatusText}>{status.icon} {status.label}</Text>
                      </View>
                    </View>
                    {eta && (
                      <View style={styles.etaRow}>
                        <Text style={styles.etaText}>⏱ ETA: ~{Math.round(eta)} min</Text>
                      </View>
                    )}
                    {idx < route.stops.length - 1 && (
                      <View style={styles.stopConnector} />
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.section}>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(driver)/attendance')}
              >
                <Text style={styles.actionEmoji}>✅</Text>
                <Text style={styles.actionLabel}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(driver)/students')}
              >
                <Text style={styles.actionEmoji}>👦</Text>
                <Text style={styles.actionLabel}>Students</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#fff5f5' }]}
                onPress={() => router.push('/(driver)/sos')}
              >
                <Text style={styles.actionEmoji}>🚨</Text>
                <Text style={[styles.actionLabel, { color: '#c53030' }]}>SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#2d6a4f', paddingTop: verticalScale(56),
    paddingBottom: verticalScale(20), paddingHorizontal: scale(20),
  },
  title: { color: '#fff', fontSize: moderateScale(20), fontWeight: 'bold' },
  subtitle: { color: '#b7e4c7', fontSize: moderateScale(13), marginTop: verticalScale(4) },
  noTripCard: {
    margin: scale(20), backgroundColor: '#fff', borderRadius: moderateScale(16),
    padding: scale(32), alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  noTripEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  noTripTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: '#2d3748' },
  noTripSub: { fontSize: moderateScale(13), color: '#718096', marginTop: verticalScale(6), textAlign: 'center' },
  goHomeButton: { marginTop: verticalScale(16), backgroundColor: '#2d6a4f', borderRadius: moderateScale(12), paddingHorizontal: scale(24), paddingVertical: verticalScale(10) },
  goHomeText: { color: '#fff', fontWeight: '600' },
  liveBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#d8f3dc', padding: scale(10), marginHorizontal: scale(16), marginTop: verticalScale(16),
    borderRadius: moderateScale(10),
  },
  liveDot: { width: scale(8), height: verticalScale(8), borderRadius: moderateScale(4), backgroundColor: '#2d6a4f', marginRight: scale(8) },
  liveText: { fontSize: moderateScale(13), fontWeight: '600', color: '#22543d' },
  section: { margin: scale(16), marginBottom: verticalScale(0) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(8) },
  routeMeta: { fontSize: moderateScale(13), color: '#718096' },
  summaryRow: { flexDirection: 'row', gap: verticalScale(10) },
  summaryItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: moderateScale(12),
    padding: scale(14), alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  summaryNumber: { fontSize: moderateScale(24), fontWeight: 'bold', color: '#718096' },
  summaryLabel: { fontSize: moderateScale(11), color: '#a0aec0', marginTop: verticalScale(4) },
  stopCard: { marginBottom: verticalScale(4) },
  stopHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: moderateScale(14),
    padding: scale(14), shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  stopNumber: {
    width: scale(32), height: verticalScale(32), borderRadius: moderateScale(16),
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  stopNumberText: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#718096' },
  stopName: { fontSize: moderateScale(14), fontWeight: '700', color: '#2d3748' },
  stopLocation: { fontSize: moderateScale(11), color: '#a0aec0', marginTop: verticalScale(2) },
  stopStatus: { borderRadius: moderateScale(8), paddingHorizontal: scale(8), paddingVertical: verticalScale(4), marginLeft: scale(8) },
  stopStatusText: { fontSize: moderateScale(10), fontWeight: '600' },
  etaRow: { marginLeft: scale(44), marginTop: verticalScale(4), marginBottom: verticalScale(4) },
  etaText: { fontSize: moderateScale(12), color: '#2d6a4f', fontWeight: '600' },
  stopConnector: {
    width: scale(2), height: verticalScale(20), backgroundColor: '#e2e8f0',
    marginLeft: scale(15), marginVertical: verticalScale(2),
  },
  actionsRow: { flexDirection: 'row', gap: verticalScale(10), marginBottom: verticalScale(32) },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: moderateScale(14),
    padding: scale(14), alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  actionEmoji: { fontSize: moderateScale(24), marginBottom: verticalScale(6) },
  actionLabel: { fontSize: moderateScale(12), fontWeight: '600', color: '#2d3748' },
});