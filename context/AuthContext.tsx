'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'ADMIN' | 'ASSISTANT';

export interface User {
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check localStorage for logged-in user session
    const storedUser = localStorage.getItem('danke_admin_user');
    if (storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Router guard: redirect to login if not logged in
    if (!isLoading) {
      const isPublicPage = pathname === '/login';
      if (!user && !isPublicPage) {
        router.replace('/login');
      } else if (user && isPublicPage) {
        router.replace('/');
      }
    }
  }, [user, pathname, isLoading, router]);

  const login = async (username: string, role: UserRole): Promise<boolean> => {
    const newUser: User = { username, role };
    setUser(newUser);
    localStorage.setItem('danke_admin_user', JSON.stringify(newUser));
    router.replace('/');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('danke_admin_user');
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
