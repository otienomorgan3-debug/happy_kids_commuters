import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback } from 'react';
import { getNotifications, markAsRead, markAllRead } from '../../constants/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    await markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'boarding': return '🟢';
      case 'dropoff': return '🏠';
      case 'emergency': return '🚨';
      default: return '🔔';
    }
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#4a6fa5" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unread > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>
            {unread} unread notification{unread > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: scale(16) }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySub}>You will be notified when your child boards or exits the bus</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => !item.is_read && handleMarkRead(item.id)}
          >
            <Text style={styles.icon}>{getIcon(item.type)}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#4a6fa5', paddingTop: verticalScale(56),
    paddingBottom: verticalScale(16), paddingHorizontal: scale(20),
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: dynamicFontSize(16, 17, 18), fontWeight: 'bold' },
  markAll: { color: '#bee3f8', fontSize: dynamicFontSize(12, 13, 14) },
  unreadBanner: {
    backgroundColor: '#ebf4ff', padding: scale(10),
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#bee3f8'
  },
  unreadText: { color: '#4a6fa5', fontSize: dynamicFontSize(12, 13, 14), fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: moderateScale(12), padding: scale(14),
    marginBottom: verticalScale(10), flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#4a6fa5' },
  icon: { fontSize: moderateScale(24), marginRight: scale(12) },
  cardContent: { flex: 1 },
  message: { fontSize: dynamicFontSize(13, 14, 15), color: '#2d3748', fontWeight: '500' },
  time: { fontSize: dynamicFontSize(11, 12, 13), color: '#a0aec0', marginTop: verticalScale(4) },
  unreadDot: {
    width: scale(8), height: verticalScale(8), borderRadius: moderateScale(4),
    backgroundColor: '#4a6fa5', marginLeft: scale(8)
  },
  empty: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  emptyText: { fontSize: dynamicFontSize(14, 15, 16), fontWeight: '600', color: '#2d3748' },
  emptySub: { fontSize: dynamicFontSize(12, 13, 14), color: '#718096', marginTop: verticalScale(6), textAlign: 'center' },
});