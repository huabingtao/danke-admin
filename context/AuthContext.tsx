'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'ADMIN' | 'ASSISTANT';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  roleName: string;
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  menuTree: any[];
  token: string | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const apiBase = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [menuTree, setMenuTree] = useState<any[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const loadProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPermissions(data.permissions);
        setMenuTree(data.menuTree);
        setToken(authToken);
        return true;
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (err) {
      console.error('Profile loading error:', err);
      // Clean up token if invalid
      localStorage.removeItem('danke_admin_token');
      setUser(null);
      setPermissions([]);
      setMenuTree([]);
      setToken(null);
      return false;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('danke_admin_token');
      if (storedToken) {
        await loadProfile(storedToken);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    // Router guard: redirect to login if not logged in
    if (!isLoading) {
      const isPublicPage = pathname === '/login';
      if (!token && !isPublicPage) {
        router.replace('/login');
      } else if (token && isPublicPage) {
        router.replace('/');
      }
    }
  }, [token, pathname, isLoading, router]);

  const login = async (username: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: pass }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const authToken = data.access_token;
      localStorage.setItem('danke_admin_token', authToken);
      
      const loadSuccess = await loadProfile(authToken);
      if (loadSuccess) {
        router.replace('/');
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('danke_admin_token');
    setUser(null);
    setPermissions([]);
    setMenuTree([]);
    setToken(null);
    router.replace('/login');
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN' || permissions.includes('*')) {
      return true;
    }
    return permissions.includes(code);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, menuTree, token, login, logout, isLoading, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
