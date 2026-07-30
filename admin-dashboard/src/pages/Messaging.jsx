import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Messaging.css';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hkcs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const SOCKET_URL = 'http://localhost:5000';

export default function Messaging() {
  const [view, setView] = useState('list');
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Get current user ID from token
  useEffect(() => {
    const token = localStorage.getItem('hkcs_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setMyUserId(payload.id);
      } catch (e) {
        console.error('Error parsing token', e);
      }
    }
  }, []);

  // Socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Admin socket connected');
      if (myUserId) {
        socket.emit('user:register', { user_id: myUserId });
      }
    });

    // Listen for new messages in real-time
    socket.on('chat:message', (msg) => {
      if (view === 'conversation' && otherUser) {
        const msgUserId = msg.sender_id;
        const otherUserId = otherUser.other_user_id;
        if (msgUserId === otherUserId || msgUserId === myUserId) {
          setMessages(prev => {
            // Avoid duplicates
            const exists = prev.find(m => m.id === msg.id || (m.id === msg.id));
            if (exists) return prev;
            return [...prev, msg];
          });
          // Scroll to bottom
          setTimeout(scrollToBottom, 100);
        }
      }
      // Update chat list last message
      setChats(prev => prev.map(chat => {
        if (chat.other_user_id === msg.sender_id || chat.other_user_id === msg.receiver_id) {
          return { ...chat, last_message: msg.message, last_message_time: msg.created_at, last_message_read: false };
        }
        return chat;
      }));
      loadChats();
    });

    // Listen for read receipts
    socket.on('chat:read', (data) => {
      if (data.read_by === otherUser?.other_user_id) {
        setMessages(prev => prev.map(m => {
          if (m.sender_id === myUserId && m.receiver_id === data.read_by) {
            return { ...m, is_read: true };
          }
          return m;
        }));
      }
    });

    // Listen for typing indicators
    socket.on('chat:typing', (data) => {
      if (data.user_id === otherUser?.other_user_id) {
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: data.is_typing
        }));
      }
    });

    // Listen for online status
    socket.on('user:online', (data) => {
      setOnlineUsers(prev => ({
        ...prev,
        [data.user_id]: data.online
      }));
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [myUserId, view, otherUser]);

  // Register socket when userId is available
  useEffect(() => {
    if (myUserId && socketRef.current?.connected) {
      socketRef.current.emit('user:register', { user_id: myUserId });
    }
  }, [myUserId]);

  // Initial load
  useEffect(() => {
    loadChats();
    API.get('/admin/chat/contacts').then((res) => setContacts(res.data.contacts || [])).catch(console.error);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = useCallback(async () => {
    try {
      setError(null);
      const res = await API.get('/admin/chat/list');
      const chatsData = res.data.chats || [];
      setChats(chatsData);
      // Mark chats with unread messages
      setLoading(false);
    } catch (err) {
      setError('Failed to load chats');
      setLoading(false);
      console.error(err);
    }
  }, []);

  const loadConversation = useCallback(async (userId) => {
    try {
      setError(null);
      const res = await API.get(`/admin/chat/conversation/${userId}`);
      setMessages(res.data.messages || []);
      // Mark messages as read
      await API.put(`/admin/chat/read/${userId}`);
    } catch (err) {
      setError('Failed to load conversation');
      console.error(err);
    }
  }, []);

  const startConversation = async (user) => {
    setOtherUser(user);
    setView('conversation');
    setTypingUsers({});
    await loadConversation(user.other_user_id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUser || sending) return;

    setSending(true);
    try {
      setError(null);
      const res = await API.post('/admin/chat/send', {
        receiver_id: otherUser.other_user_id,
        message: newMessage.trim(),
        chat_type: otherUser.other_user_role === 'driver' ? 'admin_driver' : 'admin_parent',
      });
      setNewMessage('');

      // Add the saved message to local state
      if (res.data.chat) {
        setMessages(prev => {
          const exists = prev.find(m => m.id === res.data.chat.id);
          if (exists) return prev;
          return [...prev, res.data.chat];
        });
      }

      await loadChats(); // Refresh chat list to update last message
    } catch (err) {
      // Don't show error if socket already sent it
      if (!socketRef.current?.connected) {
        setError('Failed to send message');
      }
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // Typing indicator
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socketRef.current && otherUser && myUserId) {
      socketRef.current.emit('chat:typing', {
        receiver_id: otherUser.other_user_id,
        is_typing: e.target.value.length > 0,
      });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('chat:typing', {
            receiver_id: otherUser.other_user_id,
            is_typing: false,
          });
        }
      }, 2000);
    }
  };

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
    return otherUser && onlineUsers[otherUser.other_user_id];
  };

  const filteredChats = searchQuery
    ? chats.filter(chat =>
        chat.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  if (loading) {
    return (
      <div className="messaging-container">
        <div className="loading">Loading chats...</div>
      </div>
    );
  }

  if (view === 'conversation' && otherUser) {
    return (
      <div className="messaging-container">
        <div className="conversation-header">
          <button className="back-button" onClick={() => setView('list')}>
            ← Back to Chats
          </button>
          <div className="conversation-user-info">
            <div className="conversation-avatar">
              {otherUser.other_user_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h2>{otherUser.other_user_name}</h2>
              <span className={`user-status ${isOtherUserOnline() ? 'online' : 'offline'}`}>
                {isOtherUserOnline() ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div style={{ width: '60px' }} />
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-messages">
              <div className="empty-messages-icon">💬</div>
              <p>No messages yet. Start the conversation!</p>
              <small>Messages are synced in real-time</small>
            </div>
          ) : (
            <>
              {/* Date separators */}
              {messages.map((msg, idx) => {
                const showDateHeader = idx === 0 ||
                  new Date(msg.created_at).toDateString() !== new Date(messages[idx - 1]?.created_at).toDateString();
                return (
                  <React.Fragment key={msg.id || idx}>
                    {showDateHeader && (
                      <div className="date-separator">
                        <span>{formatDate(msg.created_at)}</span>
                      </div>
                    )}
                    <div
                      className={`message ${msg.sender_id === myUserId ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        <p className="message-text">{msg.message}</p>
                        <div className="message-meta">
                          <small className="message-time">
                            {formatTime(msg.created_at)}
                          </small>
                          {msg.sender_id === myUserId && (
                            <span className={`message-read-status ${msg.is_read ? 'read' : 'unread'}`}>
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )}
          {typingUsers[otherUser.other_user_id] && (
            <div className="typing-indicator">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <small>{otherUser.other_user_name} is typing...</small>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form className="message-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleTyping}
            disabled={sending}
            autoFocus
          />
          <button type="submit" disabled={sending || !newMessage.trim()}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="messaging-container">
      <div className="conversation-header">
        <h2>Messages</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {contacts.length > 0 && (
        <div className="chats-list">
          <div className="contacts-heading">Start a conversation</div>
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="chat-item"
              onClick={() => startConversation({
                other_user_id: contact.id,
                other_user_name: contact.name,
                other_user_role: contact.role,
              })}
            >
              <div className="chat-avatar">{contact.name?.charAt(0)?.toUpperCase() || '?'}</div>
              <div className="chat-info">
                <div className="chat-name">{contact.name}</div>
                <div className="chat-preview">{contact.role === 'driver' ? 'Driver' : 'Parent'}</div>
              </div>
            </div>
          ))}
          {filteredChats.length > 0 && <div className="contacts-heading">Recent chats</div>}
        </div>
      )}

      {filteredChats.length === 0 ? (
        <div className="empty-chats">
          <p>📬</p>
          <p>No messages yet</p>
          <small>Conversations with parents and drivers will appear here</small>
        </div>
      ) : (
        <div className="chats-list">
          {filteredChats.map((chat) => (
            <div
              key={chat.other_user_id}
              className={`chat-item ${!chat.last_message_read && chat.last_message_sender !== myUserId ? 'unread' : ''}`}
              onClick={() => startConversation(chat)}
            >
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar">{chat.other_user_name?.charAt(0)?.toUpperCase() || '?'}</div>
                <div className={`online-dot ${onlineUsers[chat.other_user_id] ? 'online' : 'offline'}`} />
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <div className="chat-name">{chat.other_user_name}</div>
                  <div className="chat-role-badge">
                    {chat.other_user_role === 'driver' ? 'Driver' : 'Parent'}
                  </div>
                </div>
                <div className="chat-preview">{chat.last_message || 'No messages yet'}</div>
              </div>
              <div className="chat-meta">
                <small className="chat-time">
                  {formatTime(chat.last_message_time)}
                </small>
                {!chat.last_message_read && (
                  <div className="unread-indicator" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
