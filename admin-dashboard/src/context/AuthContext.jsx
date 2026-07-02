import { useState, useCallback } from 'react';
import { AuthContext } from './context';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(() => !!localStorage.getItem('hkcs_token'));

    const initialize = useCallback(() => {
        const token = localStorage.getItem('hkcs_token');
        if (!token) return;
        import('../api/api').then(({ getMe }) => {
            getMe()
                .then(res => setUser(res.data.user))
                .catch(() => localStorage.removeItem('hkcs_token'))
                .finally(() => setLoading(false));
        });
    }, []);

    // Initialize auth state on mount via useState initializer
    useState(initialize);

    const login = useCallback((token, userData) => {
        localStorage.setItem('hkcs_token', token);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('hkcs_token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
