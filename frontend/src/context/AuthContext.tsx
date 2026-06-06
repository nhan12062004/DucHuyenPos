import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  // Actions
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoggedIn: false,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null, needsConfirmation: false }),
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Lấy session hiện tại khi app khởi động
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    // Lắng nghe thay đổi auth state (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Đăng nhập ─────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Việt hoá thông báo lỗi phổ biến
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Email hoặc mật khẩu không đúng.' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư.' };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  // ─── Đăng ký ───────────────────────────────────────────────────────────────
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'Email này đã được đăng ký.', needsConfirmation: false };
      }
      return { error: error.message, needsConfirmation: false };
    }

    // Supabase trả về user nhưng chưa có session -> cần xác thực email
    const needsConfirmation = !!data.user && !data.session;
    return { error: null, needsConfirmation };
  };

  // ─── Đăng xuất ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ─── Quên mật khẩu ─────────────────────────────────────────────────────────
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoggedIn: !!session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
