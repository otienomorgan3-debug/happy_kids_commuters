import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Vibration, ScrollView, ActivityIndicator
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';
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
    backgroundColor: '#2d6a4f', paddingTop: verticalScale(56),
    paddingBottom: verticalScale(16), paddingHorizontal: scale(20),
  },
  title: { color: '#fff', fontSize: moderateScale(18), fontWeight: 'bold' },
  subtitle: { color: '#b7e4c7', fontSize: moderateScale(12), marginTop: verticalScale(4) },
  content: { padding: scale(16) },
  statusCard: {
    borderRadius: moderateScale(16), padding: scale(24),
    alignItems: 'center', marginBottom: verticalScale(16)
  },
  safe: { backgroundColor: '#d8f3dc' },
  danger: { backgroundColor: '#ffe3e3' },
  statusEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(8) },
  statusTitle: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#2d3748' },
  statusSub: { fontSize: moderateScale(13), color: '#718096', marginTop: verticalScale(6), textAlign: 'center' },
  locationCard: {
    backgroundColor: '#fffbeb', borderRadius: moderateScale(12),
    padding: scale(14), marginBottom: verticalScale(16),
    borderWidth: 1, borderColor: '#fcd34d'
  },
  locationTitle: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#92400e', marginBottom: verticalScale(6) },
  locationText: { fontSize: moderateScale(13), color: '#92400e', marginBottom: verticalScale(2) },
  sosButton: {
    backgroundColor: '#c53030', borderRadius: moderateScale(20),
    padding: scale(28), alignItems: 'center', marginBottom: verticalScale(16),
    shadowColor: '#c53030', shadowOpacity: 0.3,
    shadowRadius: 12, elevation: 8
  },
  sosEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(8) },
  sosText: { color: '#fff', fontSize: moderateScale(20), fontWeight: 'bold' },
  sosSub: { color: '#fed7d7', fontSize: moderateScale(13), marginTop: verticalScale(4) },
  cancelButton: {
    backgroundColor: '#2d6a4f', borderRadius: moderateScale(16),
    padding: scale(20), alignItems: 'center', marginBottom: verticalScale(16),
    flexDirection: 'row', justifyContent: 'center', gap: verticalScale(8),
  },
  cancelEmoji: { fontSize: moderateScale(24) },
  cancelText: { color: '#fff', fontSize: moderateScale(15), fontWeight: '600' },
  instructions: {
    backgroundColor: '#fff', borderRadius: moderateScale(16),
    padding: scale(16), marginBottom: verticalScale(16)
  },
  instructionsTitle: { fontSize: moderateScale(15), fontWeight: 'bold', color: '#2d3748', marginBottom: verticalScale(12) },
  instructionItem: { flexDirection: 'row', marginBottom: verticalScale(8), alignItems: 'flex-start' },
  instructionBullet: { fontSize: moderateScale(14), color: '#718096', marginRight: scale(8) },
  instructionText: { fontSize: moderateScale(14), color: '#4a5568', flex: 1 },
  instructionNote: {
    fontSize: moderateScale(12), color: '#a0aec0', marginTop: verticalScale(12),
    fontStyle: 'italic',
  },
  historySection: {
    backgroundColor: '#fff', borderRadius: moderateScale(16),
    padding: scale(16), marginBottom: verticalScale(32)
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: scale(10), backgroundColor: '#fff5f5',
    borderRadius: moderateScale(10), marginBottom: verticalScale(8),
  },
  historyItemResolved: { backgroundColor: '#f0f4f8' },
  historyIcon: { fontSize: moderateScale(20), marginRight: scale(10) },
  historyStatus: { fontSize: moderateScale(14), fontWeight: '600', color: '#2d3748' },
  historyTime: { fontSize: moderateScale(12), color: '#718096', marginTop: verticalScale(2) },
});