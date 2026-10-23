'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../api';
import { User } from '../auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await api.get<User>('/api/auth/me');
      setState({ user: res.data ?? null, loading: false, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setState({ user: null, loading: false, error: null });
      } else {
        setState({ user: null, loading: false, error: 'Failed to load user' });
      }
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', {});
    } finally {
      setState({ user: null, loading: false, error: null });
      window.location.href = '/login';
    }
  };

  return { ...state, refetch: fetchUser, logout };
}
