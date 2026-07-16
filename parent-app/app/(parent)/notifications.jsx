import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
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
        contentContainerStyle={{ padding: 16 }}
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
    backgroundColor: '#4a6fa5', paddingTop: 56,
    paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  markAll: { color: '#bee3f8', fontSize: 13 },
  unreadBanner: {
    backgroundColor: '#ebf4ff', padding: 10,
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#bee3f8'
  },
  unreadText: { color: '#4a6fa5', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#4a6fa5' },
  icon: { fontSize: 24, marginRight: 12 },
  cardContent: { flex: 1 },
  message: { fontSize: 14, color: '#2d3748', fontWeight: '500' },
  time: { fontSize: 12, color: '#a0aec0', marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#4a6fa5', marginLeft: 8
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#2d3748' },
  emptySub: { fontSize: 13, color: '#718096', marginTop: 6, textAlign: 'center' },
});