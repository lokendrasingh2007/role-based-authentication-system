'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/auth';
import FormField from '@/components/ui/FormField';
import Spinner from '@/components/ui/Spinner';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const PASSWORD_RULES = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (!PASSWORD_RULES.test(form.password))
      errs.password = 'Min 8 chars, uppercase, lowercase, number, and special character';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await api.post<User>('/api/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email,
        password: form.password,
      });
      toast.success(`Account created! Welcome, ${res.data?.firstName ?? ''}!`);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setErrors({ email: 'This email is already registered' });
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
          <h1 className="text-3xl font-bold text-gray-900">Create an account</h1>
          <p className="mt-2 text-sm text-gray-600">Join AuthApp today</p>
        </div>

        <div className="card">
          <form onSubmit={(e) => void handleSubmit(e)} noValidate aria-label="Registration form">
            <div className="space-y-4">
              {errors.general && (
                <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {errors.general}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField id="firstName" label="First name" error={errors.firstName} required>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={update('firstName')}
                    aria-invalid={!!errors.firstName}
                    className={`input-field ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="Jane"
                  />
                </FormField>
                <FormField id="lastName" label="Last name" error={errors.lastName} required>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={update('lastName')}
                    aria-invalid={!!errors.lastName}
                    className={`input-field ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="Doe"
                  />
                </FormField>
              </div>

              <FormField id="email" label="Email address" error={errors.email} required>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update('email')}
                  aria-invalid={!!errors.email}
                  className={`input-field ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                />
              </FormField>

              <FormField id="password" label="Password" error={errors.password} required>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={update('password')}
                  aria-invalid={!!errors.password}
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min 8 chars with uppercase, number, symbol"
                />
              </FormField>

              <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword} required>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  aria-invalid={!!errors.confirmPassword}
                  className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Repeat your password"
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
                    <Spinner size="sm" /> Creating account…
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
