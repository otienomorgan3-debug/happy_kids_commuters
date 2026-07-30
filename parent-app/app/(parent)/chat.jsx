import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH, dynamicFontSize } from '../../utils/responsive';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getChatList, getChatContacts, getConversation, markChatRead, sendChatMessage, SOCKET_URL } from '../../constants/api';
import { Alert } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const [view, setView] = useState('list');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [myUserId, setMyUserId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
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
      await markChatRead(userId);
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
      const chatType = otherUser.role === 'admin' || otherUser.role === 'superadmin' ? 'parent_admin' : 'parent_driver';
      
      const res = await sendChatMessage({
        receiver_id: otherUser.id,
        message: newMessage.trim(),
        chat_type: chatType,
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
      
      // Reload chat list to update last message
      await loadChats();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
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

  const loadAvailableContacts = async () => {
    try {
      const response = await getChatContacts();
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => { loadAvailableContacts(); }, []);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    const date = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
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
    return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOtherUserOnline = () => {
    return otherUser && onlineUsers[otherUser.id];
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
        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {view === 'conversation' ? otherUser?.name || 'Chat' : 'Messages'}
          </Text>
          {view === 'conversation' && otherUser && (
            <Text style={[styles.statusText, isOtherUserOnline() ? styles.onlineText : styles.offlineText]}>
              {isOtherUserOnline() ? 'Online' : 'Offline'}
            </Text>
          )}
        </View>
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
              {contacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
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
              style={[styles.chatCard, !item.last_message_read && styles.unreadChat]}
              onPress={() => startConversation({
                id: item.other_user_id,
                name: item.other_user_name,
                role: item.other_user_role,
              })}
            >
              <View style={styles.chatAvatarWrapper}>
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {item.other_user_name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={[styles.onlineDot, onlineUsers[item.other_user_id] ? styles.online : styles.offline]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatNameRow}>
                    <Text style={[styles.chatName, !item.last_message_read && styles.unreadName]}>{item.other_user_name}</Text>
                    <Text style={styles.chatRoleBadge}>
                      {item.other_user_role === 'admin' || item.other_user_role === 'superadmin' ? 'Admin' : 'Driver'}
                    </Text>
                  </View>
                  <Text style={styles.chatTime}>{formatTime(item.last_message_time)}</Text>
                </View>
                <Text style={[styles.lastMessage, !item.last_message_read && styles.unreadMessage]} numberOfLines={1}>
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
                  <View style={[
                    styles.messageBubble,
                    isSentByMe ? styles.sentBubble : styles.receivedBubble
                  ]}>
                    <View style={styles.messageSenderRow}>
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>
                          {isSentByMe ? 'Me' : (otherUser?.name?.charAt(0)?.toUpperCase() || '?')}
                        </Text>
                      </View>
                      <Text style={styles.messageSenderName}>
                        {isSentByMe ? 'You' : (otherUser?.name || 'Unknown')}
                      </Text>
                    </View>
                    <Text style={[
                      styles.messageText,
                      isSentByMe ? styles.sentText : styles.receivedText
                    ]}>
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
                </>
              );
            }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#a0aec0"
              value={newMessage}
              onChangeText={handleTyping}
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
  headerCenter: { alignItems: 'center', flex: 1 },
  title: { color: '#fff', fontSize: dynamicFontSize(16, 17, 18), fontWeight: '800' },
  backText: { color: '#dceeff', fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700' },
  statusText: { fontSize: dynamicFontSize(9, 10, 11), fontWeight: '600', marginTop: 2 },
  onlineText: { color: '#68d391' },
  offlineText: { color: '#a0aec0' },
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
  unreadChat: { backgroundColor: '#f0fff4' },
  chatAvatarWrapper: { position: 'relative', marginRight: scale(12) },
  chatAvatar: {
    width: scale(48), height: verticalScale(48), borderRadius: moderateScale(24),
    backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center',
  },
  chatAvatarText: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#4a6fa5' },
  onlineDot: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff',
    position: 'absolute', bottom: 0, right: 0,
  },
  online: { backgroundColor: '#38a169' },
  offline: { backgroundColor: '#a0aec0' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatName: { fontSize: dynamicFontSize(13, 14, 15), fontWeight: '700', color: '#2d3748' },
  unreadName: { fontWeight: '900' },
  chatRoleBadge: {
    fontSize: dynamicFontSize(8, 9, 10), fontWeight: '700', color: '#4a6fa5',
    backgroundColor: '#ebf4ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    overflow: 'hidden', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  chatTime: { fontSize: dynamicFontSize(10, 11, 12), color: '#a0aec0' },
  lastMessage: { fontSize: dynamicFontSize(11, 12, 13), color: '#718096', marginTop: verticalScale(4) },
  unreadMessage: { fontWeight: '600', color: '#2d3748' },
  dateSeparator: { alignItems: 'center', marginVertical: verticalScale(12) },
  dateSeparatorText: {
    fontSize: dynamicFontSize(10, 11, 12), color: '#718096', fontWeight: '600',
    backgroundColor: '#e2e8f0', paddingHorizontal: scale(12), paddingVertical: verticalScale(4),
    borderRadius: 12, overflow: 'hidden',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH < 350 ? '85%' : '80%', borderRadius: moderateScale(16),
    paddingHorizontal: scale(14), paddingVertical: verticalScale(10),
    marginBottom: verticalScale(2),
  },
  sentBubble: { backgroundColor: '#4a6fa5', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  receivedBubble: { backgroundColor: '#e2e8f0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageSenderRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(4), marginLeft: scale(2),
  },
  messageAvatar: {
    width: verticalScale(24), height: verticalScale(24), borderRadius: verticalScale(12),
    backgroundColor: '#ebf4ff', alignItems: 'center', justifyContent: 'center',
    marginRight: scale(6),
  },
  messageAvatarText: { fontSize: moderateScale(11), fontWeight: '700', color: '#4a6fa5' },
  messageSenderName: { fontSize: dynamicFontSize(10, 11, 12), fontWeight: '700', color: '#4a6fa5' },
  messageText: { fontSize: dynamicFontSize(13, 14, 15), lineHeight: 20 },
  sentText: { color: '#fff' },
  receivedText: { color: '#2d3748' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: verticalScale(4) },
  messageTime: { fontSize: dynamicFontSize(9, 10, 11), color: '#a0aec0' },
  readStatus: { fontSize: dynamicFontSize(8, 9, 10) },
  read: { color: '#90cdf4' },
  unread: { color: 'rgba(255,255,255,0.5)' },
  typingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8), marginLeft: scale(4) },
  typingBubble: {
    flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: moderateScale(12),
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8), marginRight: scale(8),
  },
  typingDot: {
    fontSize: moderateScale(20), color: '#718096', lineHeight: 12, marginHorizontal: 1,
  },
  typingText: { fontSize: dynamicFontSize(10, 11, 12), color: '#718096', fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(12), paddingVertical: verticalScale(8),
    paddingBottom: verticalScale(Platform.OS === 'android' ? 28 : 8),
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
