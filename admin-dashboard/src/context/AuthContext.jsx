import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('hkcs_token');
        if (token) {
            getMe()
                .then(res => setUser(res.data.user))
                .catch(() => localStorage.removeItem('hkcs_token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = (token, userData) => {
        localStorage.setItem('hkcs_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('hkcs_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);