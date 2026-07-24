import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getChatList, getConversation, sendChatMessage, getMyStudents, SOCKET_URL } from '../../constants/api';
import { Alert } from 'react-native';
import { io } from 'socket.io-client';

export default function ChatScreen() {
  const [view, setView] = useState('list');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const router = useRouter();
  const flatListRef = useRef(null);
  const socket = useRef(null);

  useEffect(() => {
    socket.current = io(SOCKET_URL);
    socket.current.on('chat:message', (msg) => {
      if (view === 'conversation' && otherUser && msg.sender_id === otherUser.id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, [view, otherUser]);

  const loadChats = useCallback(async () => {
    try {
      const res = await getChatList();
      setChats(res.data.chats || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const loadConversation = useCallback(async (userId) => {
    try {
      const res = await getConversation(userId);
      setMessages(res.data.messages || []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const startConversation = async (user) => {
    setOtherUser(user);
    setView('conversation');
    await loadConversation(user.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !otherUser) return;
    setSending(true);
    try {
      const chatType = otherUser.role === 'admin' || otherUser.role === 'superadmin' ? 'parent_admin' : 'parent_driver';
      
      await sendChatMessage({
        receiver_id: otherUser.id,
        message: newMessage.trim(),
        chat_type: chatType,
      });
      
      setNewMessage('');
      
      // Reload conversation to show the sent message
      await loadConversation(otherUser.id);
      
      // Also reload chat list to update last message
      await loadChats();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const loadAvailableContacts = async () => {
    try {
      const studentsRes = await getMyStudents();
      const students = studentsRes.data.students || [];
      const driverSet = new Set();
      const contacts = [];
      
      students.forEach(s => {
        if (s.driver_name && !driverSet.has(s.driver_name)) {
          driverSet.add(s.driver_name);
          contacts.push({
            id: s.driver_id || `driver_${s.bus_id}`,
            name: s.driver_name || 'Driver',
            role: 'driver',
          });
        }
      });
      
      contacts.push({ id: 'admin', name: 'School Admin', role: 'admin' });
      setDrivers(contacts);
    } catch (error) {
      console.error(error);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4a6fa5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (view === 'conversation') {
            setView('list');
            setOtherUser(null);
          } else {
            router.back();
          }
        }}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {view === 'conversation' ? otherUser?.name || 'Chat' : 'Messages'}
        </Text>
        <View style={{ width: SCREEN_WIDTH < 350 ? scale(48) : scale(56) }} />
      </View>

      {view === 'list' ? (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.other_user_id?.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(40) }}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionLabel}>Contacts</Text>
              <TouchableOpacity
                style={styles.contactItem}
                onPress={loadAvailableContacts}
              >
                <View style={styles.contactAvatar}>
                  <Text style={styles.contactAvatarText}>+</Text>
                </View>
                <Text style={styles.contactName}>New Conversation</Text>
              </TouchableOpacity>
              {drivers.length > 0 && drivers.map((contact, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.contactItem}
                  onPress={() => startConversation({ id: contact.id, name: contact.name, role: contact.role })}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: contact.role === 'admin' ? '#e8f5e9' : '#e3f2fd' }]}>
                    <Text style={styles.contactAvatarText}>
                      {contact.role === 'admin' ? 'A' : 'D'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRole}>{contact.role === 'admin' ? 'Admin' : 'Driver'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Recent Chats</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                {`Tap "New Conversation" above to start chatting with your driver or school admin.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() => startConversation({
                id: item.other_user_id,
                name: item.other_user_name,
                role: item.other_user_role,
              })}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {item.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{item.other_user_name}</Text>
                  <Text style={styles.chatTime}>{formatTime(item.last_message_time)}</Text>
                </View>
                <Text style={styles.chatRole}>
                  {item.other_user_role === 'admin' || item.other_user_role === 'superadmin' ? 'Admin' : 'Driver'}
                </Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.last_message || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, idx) => `${item.id || idx}`}
            contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(16) }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>No messages</Text>
                <Text style={styles.emptySub}>Start the conversation by sending a message below.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[
                styles.messageBubble,
                item.sender_role === 'driver' || item.sender_role === 'admin' || item.sender_role === 'superadmin'
                  ? styles.receivedBubble : styles.sentBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  (item.sender_role === 'driver' || item.sender_role === 'admin' || item.sender_role === 'superadmin')
                    ? styles.receivedText : styles.sentText
                ]}>
                  {item.message}
                </Text>
                <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              </View>
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#a0aec0"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#4a6fa5', paddingTop: verticalScale(56), paddingHorizontal: scale(16), paddingBottom: verticalScale(16),
  },
  title: { color: '#fff', fontSize: dynamicFontSize(16, 17, 18), fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700' },
  sectionLabel: {
    fontSize: dynamicFontSize(11, 12, 13), fontWeight: '700', color: '#718096',
    marginBottom: verticalScale(8), marginTop: verticalScale(4), textTransform: 'uppercase', letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: moderateScale(12),
    padding: scale(12), marginBottom: verticalScale(8),
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  contactAvatar: {
    width: scale(44), height: verticalScale(44), borderRadius: moderateScale(22),
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center', marginRight: scale(12),
  },
  contactAvatarText: { fontSize: moderateScale(18), fontWeight: 'bold', color: '#4a6fa5' },
  contactName: { fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700', color: '#2d3748' },
  contactRole: { fontSize: dynamicFontSize(10, 11, 12), color: '#718096', marginTop: verticalScale(2) },
  divider: { height: verticalScale(1), backgroundColor: '#e2e8f0', marginVertical: verticalScale(12) },
  chatCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: moderateScale(14),
    padding: scale(14), marginBottom: verticalScale(10),
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  chatAvatar: {
    width: scale(48), height: verticalScale(48), borderRadius: moderateScale(24),
    backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center', marginRight: scale(12),
  },
  chatAvatarText: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#4a6fa5' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700', color: '#2d3748' },
  chatTime: { fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0' },
  chatRole: { fontSize: dynamicFontSize(10, 11, 12), color: '#4a6fa5', fontWeight: '600', marginTop: verticalScale(2) },
  lastMessage: { fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(4) },
  messageBubble: {
    maxWidth: SCREEN_WIDTH < 350 ? '85%' : '80%', borderRadius: moderateScale(16),
    paddingHorizontal: scale(14), paddingVertical: verticalScale(10),
    marginBottom: verticalScale(10),
  },
  sentBubble: { backgroundColor: '#4a6fa5', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  receivedBubble: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: dynamicFontSize(13, 14, 15), lineHeight: 20 },
  sentText: { color: '#fff' },
  receivedText: { color: '#2d3748' },
  messageTime: { fontSize: dynamicFontSize(9, 10, 11), color: '#a0aec0', marginTop: verticalScale(4), textAlign: 'right' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8),
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1, backgroundColor: '#f7fafc', borderRadius: moderateScale(20),
    paddingHorizontal: scale(16), paddingVertical: verticalScale(10),
    fontSize: dynamicFontSize(13, 14, 15), color: '#2d3748', marginRight: scale(8),
  },
  sendButton: {
    backgroundColor: '#4a6fa5', borderRadius: moderateScale(20),
    paddingHorizontal: scale(18), paddingVertical: verticalScale(10),
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: dynamicFontSize(12, 13, 14) },
  empty: { alignItems: 'center', paddingTop: verticalScale(60) },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  emptyTitle: { fontSize: dynamicFontSize(14, 15, 16), fontWeight: '800', color: '#2d3748' },
  emptySub: { fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(6), textAlign: 'center', paddingHorizontal: scale(20) },
});