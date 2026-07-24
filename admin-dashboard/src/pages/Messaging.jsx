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
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    socketRef.current.on('chat:message', (msg) => {
      if (view === 'conversation' && otherUser && msg.sender_id === otherUser.id) {
        setMessages(prev => [...prev, msg]);
      }
    });
    socketRef.current.on('chat:admin_message', (msg) => {
      if (view === 'conversation' && otherUser && msg.sender_id === otherUser.id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [view, otherUser]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = useCallback(async () => {
    try {
      setError(null);
      const res = await API.get('/admin/chat/list');
      setChats(res.data.chats || []);
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
    } catch (err) {
      setError('Failed to load conversation');
      console.error(err);
    }
  }, []);

  const startConversation = async (user) => {
    setOtherUser(user);
    setView('conversation');
    await loadConversation(user.other_user_id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUser || sending) return;

    setSending(true);
    try {
      setError(null);
      await API.post('/admin/chat/send', {
        receiver_id: otherUser.other_user_id,
        message: newMessage.trim(),
        chat_type: 'admin_parent',
      });
      setNewMessage('');
      await loadConversation(otherUser.other_user_id);
      await loadChats(); // Refresh chat list to update last message
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

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
          <h2>{otherUser.other_user_name}</h2>
          <div style={{ width: '60px' }} />
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-messages">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.sender_id === otherUser.other_user_id ? 'received' : 'sent'}`}
              >
                <div className="message-bubble">
                  <p className="message-text">{msg.message}</p>
                  <small className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </small>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form className="message-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      {chats.length === 0 ? (
        <div className="empty-chats">
          <p>No messages yet</p>
          <small>Conversations with parents will appear here</small>
        </div>
      ) : (
        <div className="chats-list">
          {chats.map((chat) => (
            <div
              key={chat.other_user_id}
              className="chat-item"
              onClick={() => startConversation(chat)}
            >
              <div className="chat-avatar">{chat.other_user_name.charAt(0).toUpperCase()}</div>
              <div className="chat-info">
                <div className="chat-name">{chat.other_user_name}</div>
                <div className="chat-preview">{chat.last_message}</div>
              </div>
              <div className="chat-meta">
                <small className="chat-time">
                  {new Date(chat.last_message_time).toLocaleDateString()}
                </small>
                {!chat.last_message_read && <div className="unread-indicator" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
