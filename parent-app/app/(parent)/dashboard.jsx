import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, isSmallScreen, dynamicFontSize } from '../../utils/responsive';
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
      setStudents(studentsRes.data?.students || []);
      setUnread(notifRes.data?.unread || 0);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      if (err.response?.status === 401) {
        await removeToken();
        router.replace('/(auth)/parent-login');
      }
      setStudents([]);
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
      ) : (
        <View style={styles.studentsGrid}>
          {students.map(student => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {student.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  <Text style={styles.schoolName} numberOfLines={1}>{student.school_name}</Text>
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) }]}>
                <Text style={styles.statusText} numberOfLines={1}>{getStatusText(student.status)}</Text>
              </View>

              <Text style={styles.locationValue} numberOfLines={1}>📍 {student.pickup_location}</Text>

              <TouchableOpacity
                style={styles.trackButton}
                onPress={() => router.push('/(parent)/map')}
              >
                <Text style={styles.trackButtonText}>Track</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          { label: 'Live Map', route: '/(parent)/map', accent: '#4a6fa5' },
          { label: 'Chat', route: '/(parent)/chat', accent: '#2d6a4f' },
          { label: 'Payments', route: '/(parent)/payments', accent: '#d97706' },
          { label: 'Alerts', route: '/(parent)/notifications', accent: '#dc2626' },
          { label: 'Emergency', route: '/(parent)/emergency-alerts', accent: '#991b1b' },
          { label: 'Schedule', route: '/(parent)/schedule-preview', accent: '#4a6fa5' },
          { label: 'Profile', route: '/(parent)/profile', accent: '#718096' },
          { label: 'Transport History', route: '/(parent)/transport-history', accent: '#4a5568' },
          { label: 'Mark Absent', route: '/(parent)/mark-absent', accent: '#c2410c' },
          { label: 'Change Pickup', route: '/(parent)/change-pickup', accent: '#0369a1' },
        ].map(action => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route)}
          >
            <View style={[styles.actionAccent, { backgroundColor: action.accent }]} />
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
    padding: scale(24), paddingTop: verticalScale(56), paddingBottom: verticalScale(32),
  },
  greeting: { color: '#bee3f8', fontSize: moderateScale(14) },
  name: { color: '#fff', fontSize: moderateScale(22), fontWeight: 'bold', marginTop: verticalScale(2) },
  notifButton: { position: 'relative', padding: scale(8) },
  notifEmoji: { fontSize: moderateScale(24) },
  badge: {
    position: 'absolute', top: verticalScale(4), right: scale(4),
    backgroundColor: '#e53e3e', borderRadius: scale(10),
    width: scale(18), height: scale(18), alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { color: '#fff', fontSize: moderateScale(10), fontWeight: 'bold' },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    marginTop: verticalScale(24),
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(17), fontWeight: 'bold', color: '#2d3748',
  },
  addChildButton: {
    backgroundColor: '#4a6fa5',
    borderRadius: 999,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
  },
  addChildButtonText: { color: '#fff', fontSize: moderateScale(12), fontWeight: '700' },
  studentCard: {
    backgroundColor: '#fff', borderRadius: verticalScale(12), padding: verticalScale(14),
    width: isSmallScreen() ? '100%' : '48%',
    minWidth: isSmallScreen() ? '100%' : scale(150),
    maxWidth: isSmallScreen() ? '100%' : scale(200),
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: verticalScale(6), elevation: 1,
    marginBottom: verticalScale(12),
    minHeight: verticalScale(200),
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: verticalScale(8)
  },
  studentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(12) },
  avatar: {
    width: verticalScale(40), height: verticalScale(40), borderRadius: verticalScale(20),
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center',
    marginRight: scale(10)
  },
  avatarText: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#4a6fa5' },
  studentInfo: { flex: 1, minWidth: 0, marginRight: scale(6) },
  studentName: { fontSize: dynamicFontSize(11, 12, 13), fontWeight: '700', color: '#2d3748', numberOfLines: 1, flexShrink: 1 },
  schoolName: { fontSize: dynamicFontSize(9, 10, 11), color: '#718096', marginTop: verticalScale(2), numberOfLines: 1, flexShrink: 1 },
  statusBadge: { borderRadius: verticalScale(8), paddingVertical: verticalScale(4), paddingHorizontal: verticalScale(6), marginBottom: verticalScale(6), alignSelf: 'flex-start', flexShrink: 1, maxWidth: '100%' },
  statusText: { fontSize: dynamicFontSize(8, 9, 10), fontWeight: '700', color: '#2d3748', numberOfLines: 1, flexShrink: 1 },
  locationValue: { fontSize: dynamicFontSize(8, 9, 10), color: '#4a5568', marginBottom: verticalScale(8), numberOfLines: 1, flexShrink: 1, width: '100%' },
  trackButton: {
    backgroundColor: '#4a6fa5', borderRadius: verticalScale(8),
    paddingVertical: verticalScale(10), alignItems: 'center',
    paddingHorizontal: verticalScale(12),
    marginTop: 'auto',
    alignSelf: 'stretch',
    minHeight: verticalScale(36)
  },
  trackButtonText: { color: '#fff', fontWeight: '700', fontSize: dynamicFontSize(10, 11, 12), textAlign: 'center' },
  studentsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: scale(12), marginBottom: verticalScale(24), gap: verticalScale(10),
    justifyContent: 'space-between'
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: verticalScale(16), padding: verticalScale(32),
    marginHorizontal: scale(16), alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: verticalScale(8), elevation: 1
  },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  emptyTitle: { fontSize: moderateScale(16), fontWeight: 'bold', color: '#2d3748' },
  emptySub: { fontSize: moderateScale(13), color: '#718096', marginTop: verticalScale(4), textAlign: 'center' },
  emptyActionButton: {
    marginTop: verticalScale(14),
    backgroundColor: '#4a6fa5',
    borderRadius: verticalScale(12),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
  },
  emptyActionText: { color: '#fff', fontWeight: '700', fontSize: moderateScale(13) },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(16),
    marginBottom: verticalScale(32), gap: verticalScale(12),
    justifyContent: 'space-between'
  },
  actionCard: {
    width: isSmallScreen() ? '48%' : '30%',
    minWidth: scale(100),
    maxWidth: scale(130),
    backgroundColor: '#fff', 
    borderRadius: verticalScale(16),
    padding: verticalScale(16), 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: verticalScale(8), elevation: 2,
    flexDirection: 'column', 
    gap: verticalScale(12),
    marginBottom: verticalScale(12),
    minHeight: verticalScale(130)
  },
  actionAccent: {
    width: scale(28), height: verticalScale(6), borderRadius: verticalScale(3),
  },
  actionLabel: { fontSize: dynamicFontSize(9, 10, 11), fontWeight: '700', color: '#2d3748', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3, numberOfLines: 2, lineHeight: moderateScale(15) },
});