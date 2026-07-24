import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  RefreshControl
} from 'react-native';
import { moderateScale, scale, verticalScale, SCREEN_WIDTH } from '../../utils/responsive';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getChatList, getConversation, sendChatMessage, SOCKET_URL } from '../../constants/api';
import { io } from 'socket.io-client';

export default function DriverChatScreen() {
  const [view, setView] = useState('list');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      await sendChatMessage({
        receiver_id: otherUser.id,
        message: newMessage.trim(),
        chat_type: 'driver_parent',
      });
      setNewMessage('');
      await loadConversation(otherUser.id);
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, [loadChats]);

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
          <Text style={styles.headerTitle}>{otherUser.name}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.sender_id === otherUser.id ? styles.received : styles.sent]}>
              <View style={[styles.messageBubble, item.sender_id === otherUser.id ? styles.receivedBubble : styles.sentBubble]}>
                <Text style={[styles.messageText, item.sender_id === otherUser.id ? styles.receivedText : styles.sentText]}>
                  {item.message}
                </Text>
                <Text style={styles.messageTime}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || !newMessage.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
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

      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.other_user_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => startConversation({ id: item.other_user_id, name: item.other_user_name, role: item.other_user_role })}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>{item.other_user_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.chatContent}>
                <Text style={styles.chatName}>{item.other_user_name}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message}</Text>
              </View>
              <Text style={styles.chatTime}>
                {new Date(item.last_message_time).toLocaleDateString()}
              </Text>
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
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  backButton: {
    color: '#fff',
    fontSize: moderateScale(16),
    marginRight: scale(16),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: '#718096',
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  chatAvatar: {
    width: scale(48),
    height: verticalScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#ebf4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  chatAvatarText: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#4a6fa5',
  },
  chatContent: {
    flex: 1,
  },
  chatName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: verticalScale(4),
  },
  lastMessage: {
    fontSize: moderateScale(12),
    color: '#718096',
  },
  chatTime: {
    fontSize: moderateScale(11),
    color: '#a0aec0',
  },
  messageRow: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
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
  messageTime: {
    fontSize: moderateScale(11),
    color: '#718096',
  },
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
