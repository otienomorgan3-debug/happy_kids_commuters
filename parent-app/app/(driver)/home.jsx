import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, RefreshControl
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import {
  getMe, startTrip, endTrip, removeToken, SOCKET_URL,
  getRoutes, getRouteById
} from '../../constants/api';

export default function DriverHome() {
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [location, setLocation] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [activeRoute, setActiveRoute] = useState(null);
  const socketRef = useRef(null);
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

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await getRoutes();
      const availableRoutes = res.data.routes || [];
      setRoutes(availableRoutes);
      if (availableRoutes.length > 0) {
        setSelectedRouteId(String(availableRoutes[0].id));
      }
    } catch {
      console.log('Failed to load routes');
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchRoutes();
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('connect', () => console.log('Socket connected'));
    requestLocationPermission();
    return () => {
      socketRef.current?.disconnect();
      if (locationRef.current) locationRef.current.remove();
    };
  }, [fetchUser, fetchRoutes]);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is needed to broadcast GPS');
    }
  };

  const handleStartTrip = async () => {
    if (!selectedRouteId) {
      Alert.alert('Select route', 'Please select a route before starting the trip.');
      return;
    }

    try {
      const res = await startTrip({ route_id: Number(selectedRouteId) });
      const newTrip = res.data.trip;
      setTrip(newTrip);
      socketRef.current?.emit('driver:join', { bus_id: newTrip.bus_id });
      startGPSBroadcast(newTrip);

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
    await fetchRoutes();
    setRefreshing(false);
  }, [fetchUser, fetchRoutes]);

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
        <Text style={styles.sectionTitle}>Route Selection</Text>
        <View style={styles.routeCard}>
          <Text style={styles.routeLabel}>Choose the optimized route before starting</Text>
          <View style={styles.routeOptions}>
            {routes.map(route => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeOption,
                  selectedRouteId === String(route.id) && styles.routeOptionSelected,
                ]}
                onPress={() => setSelectedRouteId(String(route.id))}
              >
                <Text
                  style={[
                    styles.routeOptionText,
                    selectedRouteId === String(route.id) && styles.routeOptionTextSelected,
                  ]}
                >
                  {route.route_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {activeRoute && (
            <View style={styles.routeSummary}>
              <Text style={styles.routeSummaryTitle}>{activeRoute.route_name}</Text>
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
            { label: 'Students', route: '/(driver)/students', emoji: '👦' },
            { label: 'Route Guide', route: '/(driver)/route-guidance', emoji: '🗺️' },
            { label: 'Attendance', route: '/(driver)/attendance', emoji: '✅' },
            { label: 'SOS', route: '/(driver)/sos', emoji: '🚨' },
          ].map(action => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
            >
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
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
  routeLabel: { fontSize: 13, color: '#718096', marginBottom: 12 },
  routeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  routeOption: {
    borderWidth: 1,
    borderColor: '#cbd5e0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  routeOptionSelected: {
    backgroundColor: '#2d6a4f',
    borderColor: '#2d6a4f'
  },
  routeOptionText: { fontSize: 13, color: '#2d3748', fontWeight: '600' },
  routeOptionTextSelected: { color: '#fff' },
  routeSummary: { marginTop: 14, padding: 12, backgroundColor: '#f7fafc', borderRadius: 12 },
  routeSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#2d3748', marginBottom: 8 },
  routeStopText: { fontSize: 12, color: '#4a5568', marginBottom: 4 },
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
    padding: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  actionEmoji: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 10, fontWeight: '600', color: '#2d3748', textAlign: 'center' },
});
