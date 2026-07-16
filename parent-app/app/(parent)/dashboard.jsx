import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMe, getMyStudents, getNotifications, removeToken } from '../../constants/api';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const [meRes, studentsRes, notifRes] = await Promise.all([
        getMe(),
        getMyStudents(),
        getNotifications()
      ]);
      setUser(meRes.data.user);
      setStudents(studentsRes.data.students);
      setUnread(notifRes.data.unread);
    } catch (err) {
      if (err.response?.status === 401) {
        await removeToken();
        router.replace('/(auth)/parent-login');
      }
    }
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'boarded': return '#e8f5e9';
      case 'dropped': return '#e3f2fd';
      default: return '#f5f5f5';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'boarded': return '🟢 On the bus';
      case 'dropped': return '🏠 Dropped off safely';
      default: return '⏳ Waiting for pickup';
    }
  };

  const getPaymentText = (status) => {
    switch (status) {
      case 'cleared': return 'All fees cleared';
      case 'payment_due': return 'Payment due';
      default: return 'Payment status';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{user?.name || 'Parent'}</Text>
        </View>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={() => router.push('/(parent)/notifications')}
        >
          <Text style={styles.notifEmoji}>🔔</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Children */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Your Children</Text>
        <TouchableOpacity style={styles.addChildButton} onPress={() => router.push('/(parent)/add-child')}>
          <Text style={styles.addChildButtonText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No children added yet</Text>
          <Text style={styles.emptySub}>Add your first child to start tracking the bus</Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => router.push('/(parent)/add-child')}
          >
            <Text style={styles.emptyActionText}>+ Add Child</Text>
          </TouchableOpacity>
        </View>
      ) : students.map(student => (
        <View key={student.id} style={styles.studentCard}>
          <View style={styles.studentHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {student.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.schoolName}>{student.school_name}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) }]}>
            <Text style={styles.statusText}>{getStatusText(student.status)}</Text>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>📍 Pickup:</Text>
            <Text style={styles.locationValue}>{student.pickup_location}</Text>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>💳 Fees:</Text>
            <Text style={styles.locationValue}>
              {getPaymentText(student.payment_status)} · KES {Number(student.outstanding_balance || 0).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => router.push('/(parent)/map')}
          >
            <Text style={styles.trackButtonText}>Track Bus</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { icon: 'map', label: 'Live Map', route: '/(parent)/map' },
          { icon: 'message-text-outline', label: 'Chat', route: '/(parent)/chat' },
          { icon: 'credit-card-outline', label: 'Payments', route: '/(parent)/payments' },
          { icon: 'bell-alert', label: 'Alerts', route: '/(parent)/notifications' },
          { icon: 'account', label: 'Profile', route: '/(parent)/profile' },
          { icon: 'history', label: 'Transport History', route: '/(parent)/transport-history' },
          { icon: 'close-circle-outline', label: 'Mark Absent', route: '/(parent)/mark-absent' },
          { icon: 'map-marker-edit', label: 'Change Pickup', route: '/(parent)/change-pickup' },
        ].map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route)}
          >
            <MaterialCommunityIcons name={action.icon} size={28} color="#4a6fa5" />
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: '#4a6fa5',
    padding: 24, paddingTop: 56, paddingBottom: 32,
  },
  greeting: { color: '#bee3f8', fontSize: 14 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 2 },
  notifButton: { position: 'relative', padding: 8 },
  notifEmoji: { fontSize: 24 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#e53e3e', borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: 'bold', color: '#2d3748',
  },
  addChildButton: {
    backgroundColor: '#4a6fa5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addChildButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  studentCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#4a6fa5' },
  studentInfo: { marginLeft: 12, flex: 1 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  schoolName: { fontSize: 13, color: '#718096', marginTop: 2 },
  statusBadge: { borderRadius: 10, padding: 10, marginBottom: 10 },
  statusText: { fontSize: 14, fontWeight: '600', color: '#2d3748' },
  locationRow: { flexDirection: 'row', marginBottom: 4 },
  locationLabel: { fontSize: 13, color: '#718096', marginRight: 4 },
  locationValue: { fontSize: 13, color: '#2d3748', flex: 1 },
  trackButton: {
    backgroundColor: '#4a6fa5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 10
  },
  trackButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    marginHorizontal: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 4, textAlign: 'center' },
  emptyActionButton: {
    marginTop: 14,
    backgroundColor: '#4a6fa5',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16,
    marginBottom: 32, gap: 10
  },
  actionCard: {
    width: '23%', minWidth: 72, backgroundColor: '#fff', borderRadius: 16,
    padding: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  actionLabel: { fontSize: 10, fontWeight: '600', color: '#2d3748', marginTop: 6, textAlign: 'center' },
});
