import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { getAssignedStudents, markBoarded, markDropped } from '../../constants/api';

export default function Attendance() {
  const [students, setStudents] = useState([]);
  const [tripId, setTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [stats, setStats] = useState({ waiting: 0, boarded: 0, dropped: 0 });

  const fetchData = async () => {
    try {
      const res = await getAssignedStudents();
      const studentsList = res.data.students || [];
      setStudents(studentsList);
      setTripId(res.data.trip_id);
      setStats({
        waiting: studentsList.filter(s => s.status === 'waiting').length,
        boarded: studentsList.filter(s => s.status === 'boarded').length,
        dropped: studentsList.filter(s => s.status === 'dropped').length,
      });
    } catch (err) {
      console.error(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleBoarded = (student) => {
    Alert.alert(
      'Confirm Boarding',
      `Mark ${student.name} as boarded?\n\nPickup: ${student.pickup_location}\n📞 Parent: ${student.parent_phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Confirm Boarded',
          onPress: async () => {
            if (!tripId) return Alert.alert('No Active Trip', 'Start a trip first from the Home tab');
            setActionLoading(student.id);
            try {
              await markBoarded({ student_id: student.id, trip_id: tripId });
              Alert.alert('Boarded', `${student.name} is on the bus. Parent notified.`);
              await fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to mark boarded');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const handleDropped = (student) => {
    Alert.alert(
      'Confirm Drop-off',
      `Drop off ${student.name}?\n\nDropoff: ${student.dropoff_location}\n📞 Parent: ${student.parent_phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✓ Confirm Dropped Off',
          onPress: async () => {
            if (!tripId) return Alert.alert('No Active Trip', 'Start a trip first from the Home tab');
            setActionLoading(student.id);
            try {
              await markDropped({ student_id: student.id, trip_id: tripId });
              Alert.alert('✅ Dropped Off', `${student.name} dropped off safely. Parent notified.`);
              await fetchData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to mark dropped');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2d6a4f" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Attendance</Text>
          {tripId && <Text style={styles.tripId}>Trip #{tripId}</Text>}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#718096' }]}>{stats.waiting}</Text>
            <Text style={styles.statLabel}>Waiting</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#2d6a4f' }]}>{stats.boarded}</Text>
            <Text style={styles.statLabel}>On Bus</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4a6fa5' }]}>{stats.dropped}</Text>
            <Text style={styles.statLabel}>Dropped</Text>
          </View>
        </View>
      </View>

      {!tripId && (
        <View style={styles.noTrip}>
          <Text style={styles.noTripEmoji}>⏸️</Text>
          <Text style={styles.noTripText}>
            No active trip. Go to Home tab and press Start Trip first.
          </Text>
        </View>
      )}

      <FlatList
        data={students}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👦</Text>
            <Text style={styles.emptyTitle}>No students to show</Text>
            <Text style={styles.emptySub}>Students assigned to this route will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.phone}>📞 {item.parent_phone}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'boarded' ? styles.statusBoarded :
                item.status === 'dropped' ? styles.statusDropped :
                styles.statusWaiting
              ]}>
                <Text style={styles.statusBadgeText}>
                  {item.status === 'boarded' ? '🟢 On Bus' :
                   item.status === 'dropped' ? '🏠 Done' :
                   '⏳ Waiting'}
                </Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>📍 Pickup:</Text>
              <Text style={styles.locationValue}>{item.pickup_location}</Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>🏫 Dropoff:</Text>
              <Text style={styles.locationValue}>{item.dropoff_location}</Text>
            </View>

            <View style={styles.buttonsRow}>
              {item.status === 'waiting' && (
                <TouchableOpacity
                  style={[styles.boardButton, actionLoading === item.id && styles.buttonDisabled]}
                  onPress={() => handleBoarded(item)}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.buttonText}>🟢 Board</Text>
                  }
                </TouchableOpacity>
              )}

              {item.status === 'boarded' && (
                <TouchableOpacity
                  style={[styles.dropButton, actionLoading === item.id && styles.buttonDisabled]}
                  onPress={() => handleDropped(item)}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.buttonText}>🏠 Drop Off</Text>
                  }
                </TouchableOpacity>
              )}

              {item.status === 'dropped' && (
                <View style={styles.doneTag}>
                  <Text style={styles.doneText}>✅ Completed</Text>
                </View>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#2d6a4f', paddingTop: 56,
    paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  tripId: { color: '#b7e4c7', fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6, minWidth: 50 },
  statNumber: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 9, color: '#b7e4c7', marginTop: 1 },
  noTrip: {
    backgroundColor: '#fffbeb', padding: 16,
    margin: 16, borderRadius: 10, borderWidth: 1, borderColor: '#fcd34d',
    alignItems: 'center',
  },
  noTripEmoji: { fontSize: 32, marginBottom: 8 },
  noTripText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#d8f3dc', alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2d6a4f' },
  info: { flex: 1, marginLeft: 10 },
  studentName: { fontSize: 15, fontWeight: 'bold', color: '#2d3748' },
  phone: { fontSize: 12, color: '#718096', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusBoarded: { backgroundColor: '#d8f3dc' },
  statusDropped: { backgroundColor: '#ebf4ff' },
  statusWaiting: { backgroundColor: '#f0f4f8' },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#2d3748' },
  locationRow: { flexDirection: 'row', marginTop: 4 },
  locationLabel: { fontSize: 12, color: '#718096', marginRight: 4, width: 70 },
  locationValue: { fontSize: 12, color: '#2d3748', flex: 1 },
  buttonsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  boardButton: {
    flex: 1, backgroundColor: '#2d6a4f',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center'
  },
  dropButton: {
    flex: 1, backgroundColor: '#4a6fa5',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center'
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  doneTag: {
    flex: 1, backgroundColor: '#f0f4f8',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center'
  },
  doneText: { color: '#718096', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 4, textAlign: 'center' },
});