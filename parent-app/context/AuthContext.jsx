import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, getToken, removeToken } from '../constants/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const token = await getToken();
      if (!token) { if (mounted) setLoading(false); return; }
      try {
        const API = (await import('../constants/api')).default;
        const res = await API.get('/auth/me');
        if (mounted) setUser(res.data.user);
      } catch {
        await removeToken();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    const s = io(SOCKET_URL, { auth: { token: user.id } });
    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  const login = useCallback((token, userData) => { setUser(userData); }, []);
  const logout = useCallback(async () => { await removeToken(); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, socket }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
