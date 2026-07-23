import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import {
  getMe, startTrip, endTrip, removeToken, SOCKET_URL,
  getRouteById, getMyAssignment, getRoutes
} from '../../constants/api';

export default function DriverHome() {
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [location, setLocation] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);
  const pendingJoinBusIdRef = useRef(null);
  const locationRef = useRef(null);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await getMe();
      setUser(res.data.user);
    } catch {
      await removeToken();
      router.replace('/(auth)/driver-login');
    }
  }, [router]);

  const loadAvailableRoutes = useCallback(async () => {
    try {
      setRouteLoading(true);
      const res = await getRoutes();
      const allRoutes = res.data.routes || [];
      setRoutes(allRoutes);
      if (!selectedRouteId && allRoutes.length > 0) {
        setSelectedRouteId(allRoutes[0].id);
      }
    } catch (err) {
      console.error('Failed to load routes', err.message);
    } finally {
      setRouteLoading(false);
    }
  }, [selectedRouteId]);

  const fetchAssignment = useCallback(async () => {
    try {
      const assignmentRes = await getMyAssignment();
      const assignmentData = assignmentRes.data?.assignment || null;
      setAssignment(assignmentData);
      if (assignmentData?.trip_id) {
        setTrip({ id: assignmentData.trip_id, bus_id: assignmentData.bus_id, route_id: assignmentData.route_id });
      } else {
        setTrip(null);
      }
      const routeId = assignmentData?.route_id;
      if (routeId) {
        const routeRes = await getRouteById(routeId).catch(() => ({ data: {} }));
        setActiveRoute(routeRes.data?.route || null);
      } else {
        setActiveRoute(null);
        await loadAvailableRoutes();
      }
    } catch (err) {
      console.log('Failed to load assignment', err.message);
      await loadAvailableRoutes();
    }
  }, [loadAvailableRoutes]);

  useEffect(() => {
    if (!assignment?.route_id && !trip && routes.length > 0 && selectedRouteId) {
      const selected = routes.find(route => route.id === selectedRouteId);
      if (selected) {
        setActiveRoute(selected);
      }
    }
  }, [assignment?.route_id, routes, selectedRouteId, trip]);

  useEffect(() => {
    fetchUser();
    fetchAssignment();
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
      if (pendingJoinBusIdRef.current) {
        socketRef.current.emit('driver:join', { bus_id: pendingJoinBusIdRef.current });
        pendingJoinBusIdRef.current = null;
      }
    });
    socketRef.current.on('disconnect', () => {
      setSocketConnected(false);
      console.log('Socket disconnected');
    });
    socketRef.current.on('connect_error', (err) => {
      console.log('Socket connect error', err.message);
    });
    requestLocationPermission();
    return () => {
      socketRef.current?.disconnect();
      if (locationRef.current) locationRef.current.remove();
    };
  }, [fetchUser, fetchAssignment]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed to broadcast GPS');
    }
  };

  const handleStartTrip = async () => {
    const routeIdToStart = assignment?.route_id || selectedRouteId;

    if (!assignment?.bus_id) {
      Alert.alert('No bus assigned', 'Your driver profile does not have a bus assigned. Contact admin.');
      return;
    }

    if (!routeIdToStart) {
      Alert.alert('No route selected', 'Choose a route before starting the trip.');
      return;
    }

    try {
      const res = await startTrip({ route_id: routeIdToStart });
      const newTrip = res.data.trip;
      setTrip(newTrip);
      if (socketRef.current?.connected) {
        socketRef.current.emit('driver:join', { bus_id: newTrip.bus_id });
      } else {
        pendingJoinBusIdRef.current = newTrip.bus_id;
      }
      await startGPSBroadcast(newTrip);

      if (newTrip.route_id) {
        const routeRes = await getRouteById(newTrip.route_id);
        setActiveRoute(routeRes.data.route);
      }

      Alert.alert('Trip Started', 'GPS broadcasting has started. Parents can now track the bus.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to start trip');
    }
  };

  const startGPSBroadcast = async (activeTrip) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is needed to broadcast GPS.');
        setBroadcasting(false);
        return;
      }

      setBroadcasting(true);
      locationRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setLocation({ latitude, longitude });
          socketRef.current?.emit('driver:location', {
            bus_id: activeTrip.bus_id, latitude, longitude
          });
        }
      );
    } catch (error) {
      console.error('GPS broadcast failed:', error.message);
      setBroadcasting(false);
      Alert.alert('GPS Error', 'Unable to start location broadcast. Please try again.');
    }
  };

  const handleEndTrip = () => {
    Alert.alert('End Trip', 'Are you sure you want to end this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip', style: 'destructive',
        onPress: async () => {
          try {
            await endTrip({ trip_id: trip.id });
            if (locationRef.current) {
              locationRef.current.remove();
              locationRef.current = null;
            }
            setBroadcasting(false);
            setTrip(null);
            setLocation(null);
            setActiveRoute(null);
            Alert.alert('Trip Ended', 'Trip completed successfully');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to end trip');
          }
        }
      }
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await removeToken();
          router.replace('/');
        }
      }
    ]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUser();
    await fetchAssignment();
    setRefreshing(false);
  }, [fetchUser, fetchAssignment]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{user?.name || 'Driver'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Status</Text>
        <View style={[styles.statusCard, trip ? styles.statusActive : styles.statusIdle]}>
          <Text style={styles.statusEmoji}>{trip ? '🟢' : '⭕'}</Text>
          <Text style={styles.statusTitle}>{trip ? 'Trip Active' : 'No Active Trip'}</Text>
          <Text style={styles.statusSub}>
            {trip ? `Trip ID: ${trip.id}` : 'Select a route and start the trip'}
          </Text>
        </View>
        {!trip ? (
          <TouchableOpacity style={styles.startButton} onPress={handleStartTrip}>
            <Text style={styles.startButtonText}>▶ Start Trip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.endButton} onPress={handleEndTrip}>
            <Text style={styles.endButtonText}>⏹ End Trip</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route</Text>
        <View style={styles.routeCard}>
          {assignment?.route_name ? (
            <>
              <Text style={styles.routeTitle}>{assignment.route_name}</Text>
              <Text style={styles.routeSub}>
                {assignment.plate_number} • Est. {assignment.estimated_time || '—'} min
              </Text>
            </>
          ) : routeLoading ? (
            <ActivityIndicator size="small" color="#4a6fa5" />
          ) : routes.length > 0 ? (
            <>
              <Text style={styles.routeSub}>Select a route before starting the trip:</Text>
              {routes.map(route => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeOption,
                    selectedRouteId === route.id && styles.routeOptionSelected
                  ]}
                  onPress={() => setSelectedRouteId(route.id)}
                >
                  <Text style={styles.routeOptionTitle}>{route.route_name}</Text>
                  <Text style={styles.routeOptionMeta}>Est. {route.estimated_time || '—'} min</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <Text style={styles.routeSub}>No routes available yet.</Text>
          )}
          {activeRoute && (
            <View style={styles.routeSummary}>
              {(activeRoute.stops || []).map(stop => (
                <Text key={stop.id} style={styles.routeStopText}>
                  {stop.stop_order}. {stop.stop_name}
                  {stop.location ? ` — ${stop.location}` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GPS Broadcasting</Text>
        <View style={styles.gpsCard}>
          <View style={styles.gpsRow}>
            <View style={[styles.gpsDot, { backgroundColor: broadcasting ? '#68d391' : '#e2e8f0' }]} />
            <Text style={styles.gpsStatus}>
              {broadcasting ? 'Broadcasting live location to parents' : 'Not broadcasting'}
            </Text>
          </View>
          {location && (
            <View style={styles.coordsBox}>
              <Text style={styles.coordsText}>📍 Lat: {location.latitude.toFixed(6)}</Text>
              <Text style={styles.coordsText}>📍 Lng: {location.longitude.toFixed(6)}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { label: 'Students', route: '/(driver)/students' },
            { label: 'Route Guide', route: '/(driver)/route-guidance' },
            { label: 'Attendance', route: '/(driver)/attendance' },
            { label: 'SOS', route: '/(driver)/sos' },
          ].map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
            >
              <View style={styles.actionAccent} />
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#2d6a4f',
    padding: 24, paddingTop: 56, paddingBottom: 32,
  },
  greeting: { color: '#b7e4c7', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  logoutText: { color: '#b7e4c7', fontSize: 13 },
  section: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748', marginBottom: 10 },
  statusCard: {
    borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 12
  },
  statusActive: { backgroundColor: '#d8f3dc' },
  statusIdle: { backgroundColor: '#f0f4f8' },
  statusEmoji: { fontSize: 40, marginBottom: 8 },
  statusTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3748' },
  statusSub: { fontSize: 13, color: '#718096', marginTop: 4, textAlign: 'center' },
  startButton: {
    backgroundColor: '#2d6a4f', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center'
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  endButton: {
    backgroundColor: '#c53030', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center'
  },
  endButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  routeTitle: { fontSize: 15, fontWeight: '700', color: '#2d3748', marginBottom: 4 },
  routeSub: { fontSize: 13, color: '#718096' },
  routeSummary: { marginTop: 14, padding: 12, backgroundColor: '#f7fafc', borderRadius: 12 },
  routeStopText: { fontSize: 12, color: '#4a5568', marginBottom: 4 },
  routeOption: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
    padding: 12, marginTop: 10,
  },
  routeOptionSelected: {
    borderColor: '#2d6a4f', backgroundColor: '#e6fffa'
  },
  routeOptionTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  routeOptionMeta: { fontSize: 12, color: '#718096', marginTop: 4 },
  gpsCard: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#e2e8f0'
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gpsDot: { width: 12, height: 12, borderRadius: 6 },
  gpsStatus: { fontSize: 14, color: '#2d3748', fontWeight: '500' },
  coordsBox: { marginTop: 12, backgroundColor: '#f7fafc', borderRadius: 8, padding: 10 },
  coordsText: { fontSize: 13, color: '#718096', marginBottom: 4 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  actionCard: {
    width: '23%', backgroundColor: '#fff', borderRadius: 16,
    padding: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    flexDirection: 'column', gap: 8,
  },
  actionAccent: {
    width: 18, height: 4, borderRadius: 2,
    backgroundColor: '#2d6a4f',
  },
  actionLabel: { fontSize: 10, fontWeight: '700', color: '#2d3748', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },
});
