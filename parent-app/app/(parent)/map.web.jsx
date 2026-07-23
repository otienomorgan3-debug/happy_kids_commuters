import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import { SOCKET_URL, getMyStudents, getRouteById, getRouteEta, removeToken } from '../../constants/api';

const NAIROBI = { latitude: -1.2921, longitude: 36.8219 };

export default function MapWeb() {
  const [busLocations, setBusLocations] = useState({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [routesById, setRoutesById] = useState({});
  const [etaByRouteId, setEtaByRouteId] = useState({});
  const socketRef = useRef(null);
  const router = useRouter();

  const fetchBusData = useCallback(async () => {
    try {
      const studentsRes = await getMyStudents();
      const nextStudents = studentsRes.data.students || [];
      console.log('[MAP WEB] students loaded', nextStudents.length, nextStudents.map(s => ({ id: s.id, name: s.name, bus_id: s.bus_id, route_id: s.route_id })));
      setStudents(nextStudents);
      if (nextStudents.length === 0) { setLoading(false); return; }

      const busIds = new Set();
      const routeIds = new Set();
      nextStudents.forEach(student => {
        if (student.bus_id) busIds.add(student.bus_id);
        if (student.route_id) routeIds.add(student.route_id);
      });
      console.log('[MAP WEB] subscribing to bus rooms', [...busIds]);
      busIds.forEach(bus_id => socketRef.current?.emit('parent:watch', { bus_id }));

      const loadedRoutes = {};
      await Promise.all(Array.from(routeIds).map(async routeId => {
        try {
          const res = await getRouteById(routeId);
          loadedRoutes[routeId] = res.data.route;
        } catch (error) {
          console.error('Failed to load route', routeId, error.message);
        }
      }));
      setRoutesById(loadedRoutes);
    } catch (err) {
      console.error('[MAP WEB] fetchBusData error', err.message);
      if (err.response?.status === 401) {
        await removeToken();
        router.replace('/(auth)/parent-login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const refreshRouteEta = useCallback(async (bus_id, bus_lat, bus_lng) => {
    const routeId = students.find(s => s.bus_id === bus_id && s.route_id)?.route_id;
    if (!routeId) return;
    try {
      const res = await getRouteEta(routeId, { bus_lat, bus_lng });
      setEtaByRouteId(prev => ({ ...prev, [routeId]: res.data }));
    } catch (error) {
      console.error('ETA error:', error.message);
    }
  }, [students]);

  useEffect(() => {
    console.log('[MAP WEB] socket effect running');
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('connect', () => { setConnected(true); console.log('[MAP WEB] socket connected'); });
    socketRef.current.on('disconnect', () => { setConnected(false); console.log('[MAP WEB] socket disconnected'); });
    socketRef.current.on('connect_error', (err) => console.log('[MAP WEB] socket connect_error', err.message));
    socketRef.current.on('bus:location', (data) => {
      console.log('[MAP WEB] received bus:location', data);
      setBusLocations(prev => ({ ...prev, [data.bus_id]: data }));
      refreshRouteEta(data.bus_id, data.latitude, data.longitude);
    });
    socketRef.current.on('emergency:alert', (data) => {
      alert(`EMERGENCY!\nBus ${data.bus_id} needs help!\n${data.message}`);
    });
    return () => { console.log('[MAP WEB] socket cleanup'); socketRef.current?.disconnect(); };
  }, [refreshRouteEta]);

  useFocusEffect(useCallback(() => { fetchBusData(); }, [fetchBusData]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBusData();
    setRefreshing(false);
  }, [fetchBusData]);

  const buses = Object.values(busLocations);

  const getStopEtaForStudent = (student) => {
    if (!student.route_id) return null;
    const route = etaByRouteId[student.route_id];
    if (!route?.stops_with_eta?.length) return null;
    const pickupText = (student.pickup_location || '').toLowerCase();
    const matchedStop = route.stops_with_eta.find(stop => {
      const stopName = (stop.name || stop.stop_name || '').toLowerCase();
      const stopLocation = (stop.location || '').toLowerCase();
      return pickupText.includes(stopName) || stopName.includes(pickupText) || pickupText.includes(stopLocation) || stopLocation.includes(pickupText);
    });
    return matchedStop || route.stops_with_eta[0] || null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>Live Bus Tracking</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color="#4a6fa5" /></View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Bus Tracking</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: connected ? '#68d391' : '#fc8181' }]} />
          <Text style={styles.statusText}>{connected ? 'Live' : 'Connecting...'}</Text>
        </View>
      </View>

      <View style={styles.mapNote}>
        <Text style={styles.mapNoteText}>Map view is available on mobile. Below is the live bus status.</Text>
      </View>

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          {buses.length > 0 ? `${buses.length} bus${buses.length > 1 ? 'es' : ''} active` : 'No buses currently active — pull to refresh'}
        </Text>
      </View>

      {students.length > 0 && students.map(student => {
        const etaStop = getStopEtaForStudent(student);
        return (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentCardTop}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>{student.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentSchool}>{student.school_name}</Text>
              </View>
            </View>
            <Text style={styles.locationValue}>📍 Pickup: {student.pickup_location}</Text>
            <Text style={styles.locationValue}>{etaStop ? `⏱ ETA to stop: ${etaStop.eta_display || `${etaStop.eta_minutes} min`}` : '⏱ ETA pending'}</Text>
            {student.route_id && routesById[student.route_id] && (
              <Text style={styles.routeHint}>Route: {routesById[student.route_id].route_name}</Text>
            )}
          </View>
        );
      })}

      {buses.length > 0 && buses.map(bus => {
        const routeId = students.find(s => s.bus_id === bus.bus_id && s.route_id)?.route_id;
        const etaData = routeId ? etaByRouteId[routeId] : null;
        return (
          <View key={bus.bus_id} style={styles.busRow}>
            <View style={styles.busRowInfo}>
              <Text style={styles.busRowTitle}>Bus {bus.bus_id}</Text>
              <Text style={styles.busRowSub}>{bus.latitude.toFixed(4)}, {bus.longitude.toFixed(4)}</Text>
              {etaData?.stops_with_eta?.length > 0 && (
                <Text style={styles.busRowEta}>Next stop: {etaData.stops_with_eta[0].name || etaData.stops_with_eta[0].stop_name} • {etaData.stops_with_eta[0].eta_display}</Text>
              )}
            </View>
            <Text style={styles.busRowTime}>{new Date(bus.timestamp).toLocaleTimeString()}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#4a6fa5', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 12 },
  mapNote: { padding: 16, alignItems: 'center' },
  mapNoteText: { color: '#718096', fontSize: 13, textAlign: 'center' },
  infoBar: { backgroundColor: '#fff', padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 12 },
  infoText: { color: '#718096', fontSize: 13 },
  studentCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  studentCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center' },
  studentAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#4a6fa5' },
  studentInfo: { marginLeft: 12, flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#2d3748' },
  studentSchool: { fontSize: 12, color: '#718096', marginTop: 2 },
  locationValue: { fontSize: 13, color: '#2d3748', marginTop: 4 },
  routeHint: { fontSize: 12, color: '#4a6fa5', marginTop: 4, fontWeight: '600' },
  busRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  busRowInfo: { flex: 1 },
  busRowTitle: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  busRowSub: { fontSize: 12, color: '#718096', marginTop: 2 },
  busRowEta: { fontSize: 12, color: '#2d6a4f', marginTop: 4, fontWeight: '600' },
  busRowTime: { fontSize: 11, color: '#a0aec0', marginLeft: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
});
