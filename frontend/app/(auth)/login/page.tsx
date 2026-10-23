'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/auth';
import FormField from '@/components/ui/FormField';
import Spinner from '@/components/ui/Spinner';
import type { Metadata } from 'next';

// Note: metadata export is not valid in 'use client' components — use a separate layout file in production
// export const metadata: Metadata = { title: 'Sign In' };

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await api.post<User>('/api/auth/login', form);
      toast.success(`Welcome back, ${res.data?.firstName ?? 'User'}!`);
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') ?? '/dashboard';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 403) {
          setErrors({ general: 'Your account has been deactivated. Please contact support.' });
        } else if (err.statusCode === 401) {
          setErrors({ general: 'Invalid email or password' });
        } else if (err.errors) {
          setErrors(err.errors as FormErrors);
        } else {
          setErrors({ general: err.message });
        }
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        <div className="card">
          <form onSubmit={(e) => void handleSubmit(e)} noValidate aria-label="Sign in form">
            <div className="space-y-4">
              {errors.general && (
                <div
                  role="alert"
                  className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                >
                  {errors.general}
                </div>
              )}

              <FormField id="email" label="Email address" error={errors.email} required>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                />
              </FormField>

              <FormField id="password" label="Password" error={errors.password} required>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                />
              </FormField>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2"
                aria-busy={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" /> Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
