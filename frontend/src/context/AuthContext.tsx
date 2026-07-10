import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  number?: string;
  is_superuser: boolean;
  is_team_lead: boolean;
  employee_id?: number | null;
  employee_name?: string | null;
  // If assigned to multiple clients (for team lead: their primary client)
  client_id?: number | null;
  client_name?: string | null;
  clients?: Array<{ client_id: number; client_name: string; role: string }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  setActiveClient: (clientId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const logoutRef = useRef<() => void>(() => {});

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  }, []);

  logoutRef.current = logout;

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/me/');
      // Backend returns: { id, username, email, first_name, last_name, number,
      //   is_superuser, is_team_lead (or client_employee_role), employee_id, employee_name,
      //   client_id, client_name }
      const data = res.data;
      // Derive is_team_lead robustly: accept either explicit field or role field
      const isTeamLead = data.is_team_lead === true
        || data.client_employee_role === 'team_lead'
        || data.role === 'team_lead';
      setUser({
        ...data,
        is_team_lead: isTeamLead,
      });
    } catch {
      logoutRef.current();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          // Try refresh before giving up
          const refresh = localStorage.getItem('refresh_token');
          if (refresh) {
            api.post('/token/refresh/', { refresh })
              .then((res) => {
                const newAccess = res.data.access;
                localStorage.setItem('access_token', newAccess);
                setToken(newAccess);
                fetchUser();
              })
              .catch(() => {
                logout();
                setIsLoading(false);
              });
          } else {
            logout();
            setIsLoading(false);
          }
        } else {
          fetchUser();
        }
      } catch {
        logout();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = useCallback((accessToken: string, refreshToken?: string) => {
    setIsLoading(true);
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    setToken(accessToken);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const setActiveClient = useCallback((clientId: number) => {
    setUser(prev => {
      if (!prev || !prev.clients) return prev;
      const c = prev.clients.find(x => x.client_id === clientId);
      if (!c) return prev;
      return {
        ...prev,
        client_id: c.client_id,
        client_name: c.client_name
      };
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, refreshUser, setActiveClient }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
