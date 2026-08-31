import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as api from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cabo_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cabo_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('cabo_token', token);
    else localStorage.removeItem('cabo_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('cabo_user', JSON.stringify(user));
    else localStorage.removeItem('cabo_user');
  }, [user]);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (username, password) => {
    const data = await api.register(username, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
