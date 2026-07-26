import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getDriverChatList, getDriverChatContacts, getDriverConversation, markDriverChatRead, sendDriverChatMessage, SOCKET_URL } from '../../constants/api';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DriverChatScreen() {
  const [view, setView] = useState('list');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myUserId, setMyUserId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [contacts, setContacts] = useState([]);
  const router = useRouter();
  const flatListRef = useRef(null);
  const socket = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get current user info
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('hkcs_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setMyUserId(payload.id);
        }
      } catch (e) {
        console.error('Error parsing token', e);
      }
    };
    getUserInfo();
  }, []);

  // Socket connection
  useEffect(() => {
    socket.current = io(SOCKET_URL);
    const sock = socket.current;

    sock.on('connect', () => {
      if (myUserId) {
        sock.emit('user:register', { user_id: myUserId });
      }
    });

    // Listen for new messages in real-time
    sock.on('chat:message', (msg) => {
      if (view === 'conversation' && otherUser) {
        const msgUserId = msg.sender_id;
        const otherUserId = otherUser.id;
        if (msgUserId === otherUserId || msgUserId === myUserId) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === msg.id);
            if (exists) return prev;
            return [...prev, msg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
      // Update chat list
      setChats(prev => prev.map(chat => {
        if (chat.other_user_id === msg.sender_id || chat.other_user_id === msg.receiver_id) {
          return { ...chat, last_message: msg.message, last_message_time: msg.created_at, last_message_read: false };
        }
        return chat;
      }));
      loadChats();
    });

    // Listen for sent confirmation
    // Listen for read receipts
    sock.on('chat:read', (data) => {
      if (data.read_by === otherUser?.id) {
        setMessages(prev => prev.map(m => {
          if (m.sender_id === myUserId && m.receiver_id === data.read_by) {
            return { ...m, is_read: true };
          }
          return m;
        }));
      }
    });

    // Listen for typing indicators
    sock.on('chat:typing', (data) => {
      if (data.user_id === otherUser?.id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: data.is_typing
        }));
      }
    });

    // Listen for online status
    sock.on('user:online', (data) => {
      setOnlineUsers(prev => ({
        ...prev,
        [data.user_id]: data.online
      }));
    });

    return () => {
      if (sock) sock.disconnect();
    };
  }, [myUserId, view, otherUser]);

  // Re-register when userId becomes available
  useEffect(() => {
    if (myUserId && socket.current?.connected) {
      socket.current.emit('user:register', { user_id: myUserId });
    }
  }, [myUserId]);

  const loadChats = useCallback(async () => {
    try {
      const res = await getDriverChatList();
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
      const res = await getDriverConversation(userId);
      setMessages(res.data.messages || []);
      await markDriverChatRead(userId);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const startConversation = async (user) => {
    setOtherUser(user);
    setView('conversation');
    setTypingUsers({});
    await loadConversation(user.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !otherUser) return;

    setSending(true);
    try {
      const res = await sendDriverChatMessage({
        receiver_id: otherUser.id,
        message: newMessage.trim(),
        chat_type: otherUser.role === 'admin' || otherUser.role === 'superadmin' ? 'driver_admin' : 'driver_parent',
      });
      setNewMessage('');

      // Add saved message to local state
      if (res.data.chat) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === res.data.chat.id);
          if (exists) return prev;
          return [...prev, res.data.chat];
        });
      }

      await loadChats();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  // Typing indicator
  const handleTyping = (text) => {
    setNewMessage(text);
    if (socket.current && otherUser && myUserId) {
      socket.current.emit('chat:typing', {
        receiver_id: otherUser.id,
        is_typing: text.length > 0,
      });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socket.current) {
          socket.current.emit('chat:typing', {
            receiver_id: otherUser.id,
            is_typing: false,
          });
        }
      }, 2000);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

  const loadContacts = useCallback(async () => {
    try {
      const res = await getDriverChatContacts();
      setContacts(res.data.contacts || []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${date} ${time}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOtherUserOnline = () => {
    return otherUser && onlineUsers[otherUser.id];
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  if (view === 'conversation' && otherUser) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('list')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{otherUser.name}</Text>
            <Text style={[styles.statusText, isOtherUserOnline() ? styles.onlineText : styles.offlineText]}>
              {isOtherUserOnline() ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, idx) => `${item.id || idx}`}
          contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(16) }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages</Text>
              <Text style={styles.emptySub}>Start the conversation by sending a message below.</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const showDateHeader = index === 0 ||
              new Date(item.created_at).toDateString() !== new Date(messages[index - 1]?.created_at).toDateString();
            const isSentByMe = item.sender_id === myUserId;
            return (
              <>
                {showDateHeader && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{formatDate(item.created_at)}</Text>
                  </View>
                )}
                <View style={[styles.messageRow, isSentByMe ? styles.sent : styles.received]}>
                  <View style={[styles.messageBubble, isSentByMe ? styles.sentBubble : styles.receivedBubble]}>
                    <Text style={[styles.messageText, isSentByMe ? styles.sentText : styles.receivedText]}>
                      {item.message}
                    </Text>
                    <View style={styles.messageMeta}>
                      <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
                      {isSentByMe && (
                        <Text style={[styles.readStatus, item.is_read ? styles.read : styles.unread]}>
                          {item.is_read ? '✓✓' : '✓'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </>
            );
          }}
          ListFooterComponent={
            typingUsers[otherUser?.id] ? (
              <View style={styles.typingContainer}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingDot}>.</Text>
                  <Text style={styles.typingDot}>.</Text>
                  <Text style={styles.typingDot}>.</Text>
                </View>
                <Text style={styles.typingText}>{otherUser?.name} is typing...</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={handleTyping}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {chats.length === 0 && contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>Messages from parents and admin will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.other_user_id.toString()}
          ListHeaderComponent={contacts.length ? (
            <View>
              <Text style={styles.contactLabel}>Start a conversation</Text>
              {contacts.map((contact) => (
                <TouchableOpacity key={contact.id} style={styles.chatItem} onPress={() => startConversation(contact)}>
                  <View style={styles.chatAvatar}><Text style={styles.chatAvatarText}>{contact.name?.charAt(0)?.toUpperCase() || '?'}</Text></View>
                  <View style={styles.chatContent}><Text style={styles.chatName}>{contact.name}</Text><Text style={styles.lastMessage}>{contact.role === 'parent' ? 'Parent' : 'Admin'}</Text></View>
                </TouchableOpacity>
              ))}
              {chats.length ? <Text style={styles.contactLabel}>Recent chats</Text> : null}
            </View>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chatItem, !item.last_message_read && styles.unreadChat]}
              onPress={() => startConversation({ id: item.other_user_id, name: item.other_user_name, role: item.other_user_role })}
            >
              <View style={styles.chatAvatarWrapper}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>{item.other_user_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={[styles.onlineDot, onlineUsers[item.other_user_id] ? styles.online : styles.offline]} />
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatNameRow}>
                  <Text style={[styles.chatName, !item.last_message_read && styles.unreadName]}>{item.other_user_name}</Text>
                  <Text style={styles.chatRoleBadge}>
                    {item.other_user_role === 'admin' || item.other_user_role === 'superadmin' ? 'Admin' : 'Parent'}
                  </Text>
                </View>
                <Text style={[styles.lastMessage, !item.last_message_read && styles.unreadMessage]} numberOfLines={1}>
                  {item.last_message || 'No messages yet'}
                </Text>
              </View>
              <Text style={styles.chatTime}>{formatTime(item.last_message_time)}</Text>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2d6a4f',
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(16),
    paddingHorizontal: scale(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    color: '#fff',
    fontSize: moderateScale(16),
    marginRight: scale(16),
  },
  statusText: { fontSize: moderateScale(10), fontWeight: '600', marginTop: 2 },
  onlineText: { color: '#68d391' },
  offlineText: { color: '#a0aec0' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
  },
  emptyEmoji: { fontSize: moderateScale(48), marginBottom: verticalScale(12) },
  emptyTitle: { fontSize: moderateScale(16), fontWeight: '800', color: '#2d3748', marginBottom: verticalScale(4) },
  emptySub: { fontSize: moderateScale(12), color: '#718096', textAlign: 'center' },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  contactLabel: { fontSize: moderateScale(12), fontWeight: '700', color: '#52616b', paddingHorizontal: scale(16), paddingTop: verticalScale(14), paddingBottom: verticalScale(6) },
  unreadChat: { backgroundColor: '#f0fff4' },
  chatAvatarWrapper: { position: 'relative', marginRight: scale(12) },
  chatAvatar: {
    width: scale(48),
    height: verticalScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#ebf4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#4a6fa5',
  },
  onlineDot: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff',
    position: 'absolute', bottom: 0, right: 0,
  },
  online: { backgroundColor: '#38a169' },
  offline: { backgroundColor: '#a0aec0' },
  chatContent: {
    flex: 1,
  },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: verticalScale(4) },
  chatName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#2d3748',
  },
  unreadName: { fontWeight: '900' },
  chatRoleBadge: {
    fontSize: moderateScale(9), fontWeight: '700', color: '#4a6fa5',
    backgroundColor: '#ebf4ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    overflow: 'hidden', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  lastMessage: {
    fontSize: moderateScale(12),
    color: '#718096',
  },
  unreadMessage: { fontWeight: '600', color: '#2d3748' },
  chatTime: {
    fontSize: moderateScale(11),
    color: '#a0aec0',
    marginLeft: scale(8),
  },
  dateSeparator: { alignItems: 'center', marginVertical: verticalScale(12) },
  dateSeparatorText: {
    fontSize: moderateScale(11), color: '#718096', fontWeight: '600',
    backgroundColor: '#e2e8f0', paddingHorizontal: scale(12), paddingVertical: verticalScale(4),
    borderRadius: 12, overflow: 'hidden',
  },
  messageRow: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    flexDirection: 'row',
  },
  sent: {
    justifyContent: 'flex-end',
  },
  received: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    maxWidth: SCREEN_WIDTH < 350 ? '85%' : '80%',
  },
  sentBubble: {
    backgroundColor: '#2d6a4f',
  },
  receivedBubble: {
    backgroundColor: '#e2e8f0',
  },
  messageText: {
    fontSize: moderateScale(14),
    marginBottom: verticalScale(2),
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#2d3748',
  },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: verticalScale(2) },
  messageTime: {
    fontSize: moderateScale(10),
    color: '#a0aec0',
  },
  readStatus: { fontSize: moderateScale(9) },
  read: { color: '#90cdf4' },
  unread: { color: 'rgba(255,255,255,0.5)' },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8), marginLeft: scale(16) },
  typingBubble: {
    flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: moderateScale(12),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8), marginRight: scale(8),
  },
  typingDot: { fontSize: moderateScale(20), color: '#718096', lineHeight: 12, marginHorizontal: 1 },
  typingText: { fontSize: moderateScale(11), color: '#718096', fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    padding: scale(12),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: verticalScale(8),
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    fontSize: moderateScale(14),
    color: '#2d3748',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: moderateScale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: moderateScale(14),
  },
});
