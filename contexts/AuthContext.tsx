'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
    [key: string]: any;
  };
  created_at?: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('access_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');

    if (storedUser && storedAccessToken && storedRefreshToken) {
      setUser(JSON.parse(storedUser));
      setSession({
        access_token: storedAccessToken,
        refresh_token: storedRefreshToken,
      });
    }
    setLoading(false);
  }, []);

  const sendMagicLink = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirect_to: `${window.location.origin}/auth/callback`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send magic link');
      }

      const data = await response.json();
      console.log('✅ Magic link sent:', email);
      return data;
    } catch (error) {
      console.error('❌ Magic link error:', error);
      throw error;
    }
  };

  // Note: No verifyOtp function needed!
  // Supabase returns tokens directly in the callback URL
  // The callback page extracts them and calls /auth/me

  const signOut = async () => {
    try {
      const token = localStorage.getItem('access_token');

      if (token) {
        await fetch(`${API_BASE}/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      setUser(null);
      setSession(null);

      console.log('✅ Signed out');
    }
  };

  const refreshSession = async (): Promise<string | null> => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Update tokens
      localStorage.setItem('access_token', data.session.access_token);
      localStorage.setItem('refresh_token', data.session.refresh_token);

      setSession(data.session);

      console.log('✅ Token refreshed');
      return data.session.access_token;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // Clear auth state on refresh failure
      await signOut();
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    sendMagicLink,
    signOut,
    refreshSession,
    isAuthenticated: !!user && !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Helper function to get auth headers
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  return {
    'Authorization': `Bearer ${token}`,
  };
}

// Helper function for authenticated API calls with automatic token refresh
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle token expiration
  if (response.status === 401) {
    console.log('🔄 Token expired, attempting refresh...');
    
    const refreshToken = localStorage.getItem('refresh_token');

    if (refreshToken) {
      try {
        // Try to refresh token
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          localStorage.setItem('access_token', data.session.access_token);
          localStorage.setItem('refresh_token', data.session.refresh_token);

          console.log('✅ Token refreshed, retrying request...');

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${data.session.access_token}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          // Refresh failed, redirect to login
          console.error('❌ Token refresh failed, redirecting to login');
          localStorage.clear();
          window.location.href = '/login';
          throw new Error('Session expired');
        }
      } catch (error) {
        console.error('❌ Error during token refresh:', error);
        localStorage.clear();
        window.location.href = '/login';
        throw error;
      }
    } else {
      // No refresh token, redirect to login
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
  }

  return response;
}

