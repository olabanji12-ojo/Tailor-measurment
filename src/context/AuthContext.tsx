import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  shop_name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, shopName: string) => Promise<void>;
  logout: () => void;
  handleUnauthorized: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('tailor_token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('tailor_token');
    localStorage.removeItem('tailor_user');
    localStorage.removeItem('current_tailor_session');
  }, []);

  // Auto-logout when a 401 is detected anywhere in the app
  const handleUnauthorized = useCallback(() => {
    logout();
  }, [logout]);

  useEffect(() => {
    const storedToken = localStorage.getItem('tailor_token');
    const storedUser = localStorage.getItem('tailor_user');

    if (!storedToken || !storedUser) {
      setIsLoading(false);
      return;
    }

    // Verify token is still valid using a lightweight protected endpoint
    fetch(`${import.meta.env.VITE_API_URL}/measurements?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${storedToken}` }
    }).then(res => {
      if (res.ok) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Token expired or invalid — clear silently
        logout();
      }
    }).catch(() => {
      // Network error (e.g. Render sleeping) — still load from cache
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('tailor_token', data.token);
    localStorage.setItem('tailor_user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, shopName: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, shop_name: shopName }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Signup failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('tailor_token', data.token);
    localStorage.setItem('tailor_user', JSON.stringify(data.user));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, handleUnauthorized, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
