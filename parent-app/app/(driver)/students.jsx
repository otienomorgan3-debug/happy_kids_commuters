import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { getAssignedStudents } from '../../constants/api';

export default function DriverStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await getAssignedStudents();
      setStudents(res.data.students);
    } catch (err) {
      console.error(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStudents(); }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'boarded': return '#d8f3dc';
      case 'dropped': return '#ebf4ff';
      default: return '#f0f4f8';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'boarded': return '🟢 On Bus';
      case 'dropped': return '🏠 Dropped Off';
      default: return '⏳ Waiting';
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#2d6a4f" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assigned Students</Text>
        <Text style={styles.count}>{students.length} students</Text>
      </View>

      <FlatList
        data={students}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No students assigned</Text>
            <Text style={styles.emptySub}>Start a trip from Home to see assigned students</Text>
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
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
  count: { color: '#b7e4c7', fontSize: 13 },
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
  statusText: { fontSize: 11, fontWeight: '600', color: '#2d3748' },
  locationRow: { flexDirection: 'row', marginTop: 4 },
  locationLabel: { fontSize: 12, color: '#718096', marginRight: 4, width: 70 },
  locationValue: { fontSize: 12, color: '#2d3748', flex: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 4, textAlign: 'center' },
});