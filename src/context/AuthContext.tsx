import React, { createContext, useState, useContext } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'rosel@gmail.com';
const ADMIN_PASSWORD = 'Rosel1234';
const AUTH_KEY = 'rosel_admin_auth';
const AUTH_EXPIRY_KEY = 'rosel_admin_auth_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Read auth state synchronously on load (before any render)
function getInitialAuthState(): boolean {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (stored === 'true' && expiry && Date.now() < parseInt(expiry)) {
      return true;
    }
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  } catch (e) { /* ignore */ }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuthState);

  const login = (email: string, password: string): boolean => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(AUTH_EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading: false, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
