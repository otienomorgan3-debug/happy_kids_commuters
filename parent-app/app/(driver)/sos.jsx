import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Vibration, ScrollView, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { io } from 'socket.io-client';
import { SOCKET_URL, getMe, getAssignedStudents } from '../../constants/api';

export default function SOS() {
  const [user, setUser] = useState(null);
  const [sosActive, setSosActive] = useState(false);
  const [busId, setBusId] = useState(null);
  const [tripId, setTripId] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sosHistory, setSosHistory] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    loadData();
    socketRef.current = io(SOCKET_URL);
    return () => socketRef.current?.disconnect();
  }, []);

  const loadData = async () => {
    try {
      const [meRes, studentsRes] = await Promise.all([
        getMe(),
        getAssignedStudents(),
      ]);
      setUser(meRes.data.user);
      setBusId(studentsRes.data.bus_id);
      setTripId(studentsRes.data.trip_id);
    } catch {
      console.log('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = () => {
    Alert.alert(
      'Send Emergency Alert',
      'This will immediately notify all parents and school admin. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              Vibration.vibrate([500, 200, 500, 200, 500]);
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
              });
              const { latitude, longitude } = loc.coords;
              setLocation({ latitude, longitude });
              setSosActive(true);

              socketRef.current?.emit('driver:sos', {
                bus_id: busId || 1,
                latitude,
                longitude,
                driver_name: user?.name,
                trip_id: tripId,
              });

              // Record in history
              setSosHistory(prev => [{
                id: Date.now(),
                time: new Date().toISOString(),
                lat: latitude,
                lng: longitude,
                resolved: false,
              }, ...prev]);

              Alert.alert(
                'SOS Sent',
                'Emergency alert sent to all parents and school admin. Help is on the way.',
                [{ text: 'OK' }]
              );
            } catch {
              Alert.alert('Error', 'Failed to send SOS. Check location settings.');
            }
          }
        }
      ]
    );
  };

  const cancelSOS = () => {
    Alert.alert(
      'Cancel SOS',
      'Confirm the emergency is resolved? This will notify everyone that the situation is under control.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Emergency Resolved',
          onPress: () => {
            setSosActive(false);
            setLocation(null);
            // Update history
            setSosHistory(prev =>
              prev.map(s => s.id === sosHistory[0]?.id ? { ...s, resolved: true } : s)
            );
            socketRef.current?.emit('driver:sos_cancel', {
              bus_id: busId || 1,
              driver_name: user?.name,
            });
            Vibration.vibrate(200);
          }
        }
      ]
    );
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency SOS</Text>
        {busId && <Text style={styles.subtitle}>Bus #{busId}{tripId ? ` · Trip #${tripId}` : ''}</Text>}
      </View>

      <View style={styles.content}>
        {/* Status card */}
        <View style={[styles.statusCard, sosActive ? styles.danger : styles.safe]}>
          <Text style={styles.statusEmoji}>{sosActive ? '🚨' : '✅'}</Text>
          <Text style={[styles.statusTitle, sosActive && { color: '#c53030' }]}>
            {sosActive ? 'SOS ACTIVE' : 'All Clear'}
          </Text>
          <Text style={styles.statusSub}>
            {sosActive
              ? 'Emergency alert sent to parents and admin'
              : 'Use this only in a real emergency'}
          </Text>
        </View>

        {/* Location when SOS active */}
        {sosActive && location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>📍 Your Location is Being Shared</Text>
            <Text style={styles.locationText}>Latitude: {location.latitude.toFixed(6)}</Text>
            <Text style={styles.locationText}>Longitude: {location.longitude.toFixed(6)}</Text>
            {tripId && (
              <Text style={styles.locationText}>Trip: #{tripId}</Text>
            )}
          </View>
        )}

        {/* SOS button */}
        {!sosActive ? (
          <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.7}>
            <Text style={styles.sosEmoji}>🚨</Text>
            <Text style={styles.sosText}>SEND SOS ALERT</Text>
            <Text style={styles.sosSub}>Tap to alert parents and school admin</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS} activeOpacity={0.7}>
            <Text style={styles.cancelEmoji}>✅</Text>
            <Text style={styles.cancelText}>Emergency Resolved — Cancel SOS</Text>
          </TouchableOpacity>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>When to use SOS:</Text>
          {[
            'Vehicle breakdown or accident',
            'Medical emergency on the bus',
            'Route blocked or unsafe road conditions',
            'Security threat or suspicious incident',
            'Fire or other immediate danger',
          ].map((item, i) => (
            <View key={i} style={styles.instructionItem}>
              <Text style={styles.instructionBullet}>•</Text>
              <Text style={styles.instructionText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.instructionNote}>
            Your GPS location will be shared with all parents and school admin immediately.
          </Text>
        </View>

        {/* SOS History */}
        {sosHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.instructionsTitle}>SOS History</Text>
            {sosHistory.map((item) => (
              <View key={item.id} style={[
                styles.historyItem,
                item.resolved && styles.historyItemResolved
              ]}>
                <Text style={styles.historyIcon}>
                  {item.resolved ? '✅' : '🚨'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyStatus}>
                    {item.resolved ? 'Resolved' : 'Active'}
                  </Text>
                  <Text style={styles.historyTime}>{formatTime(item.time)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#2d6a4f', paddingTop: 56,
    paddingBottom: 16, paddingHorizontal: 20,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subtitle: { color: '#b7e4c7', fontSize: 12, marginTop: 4 },
  content: { padding: 16 },
  statusCard: {
    borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16
  },
  safe: { backgroundColor: '#d8f3dc' },
  danger: { backgroundColor: '#ffe3e3' },
  statusEmoji: { fontSize: 48, marginBottom: 8 },
  statusTitle: { fontSize: 20, fontWeight: 'bold', color: '#2d3748' },
  statusSub: { fontSize: 13, color: '#718096', marginTop: 6, textAlign: 'center' },
  locationCard: {
    backgroundColor: '#fffbeb', borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#fcd34d'
  },
  locationTitle: { fontSize: 14, fontWeight: 'bold', color: '#92400e', marginBottom: 6 },
  locationText: { fontSize: 13, color: '#92400e', marginBottom: 2 },
  sosButton: {
    backgroundColor: '#c53030', borderRadius: 20,
    padding: 28, alignItems: 'center', marginBottom: 16,
    shadowColor: '#c53030', shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 8
  },
  sosEmoji: { fontSize: 48, marginBottom: 8 },
  sosText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sosSub: { color: '#fed7d7', fontSize: 13, marginTop: 4 },
  cancelButton: {
    backgroundColor: '#2d6a4f', borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 16,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  cancelEmoji: { fontSize: 24 },
  cancelText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  instructions: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 16
  },
  instructionsTitle: { fontSize: 15, fontWeight: 'bold', color: '#2d3748', marginBottom: 12 },
  instructionItem: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  instructionBullet: { fontSize: 14, color: '#718096', marginRight: 8 },
  instructionText: { fontSize: 14, color: '#4a5568', flex: 1 },
  instructionNote: {
    fontSize: 12, color: '#a0aec0', marginTop: 12,
    fontStyle: 'italic',
  },
  historySection: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 16, marginBottom: 32
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, backgroundColor: '#fff5f5',
    borderRadius: 10, marginBottom: 8,
  },
  historyItemResolved: { backgroundColor: '#f0f4f8' },
  historyIcon: { fontSize: 20, marginRight: 10 },
  historyStatus: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  historyTime: { fontSize: 12, color: '#718096', marginTop: 2 },
});