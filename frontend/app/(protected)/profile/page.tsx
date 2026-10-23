'use client';

import { useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import FormField from '@/components/ui/FormField';
import Spinner from '@/components/ui/Spinner';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ProfilePage() {
  const { user, loading, refetch } = useAuth();
  const [pwForm, setPwForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState<PasswordErrors>({});
  const [pwLoading, setPwLoading] = useState(false);

  const updatePw = (field: keyof PasswordForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPwForm((p) => ({ ...p, [field]: e.target.value }));

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwErrors({});
    setPwLoading(true);

    try {
      await api.patch('/api/auth/change-password', pwForm);
      toast.success('Password changed. Please log in again.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setPwErrors(err.errors as PasswordErrors);
        } else {
          setPwErrors({ general: err.message });
        }
      }
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Account info */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 font-medium">Name</dt>
            <dd className="mt-1 text-gray-900">{user.firstName} {user.lastName}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">Email</dt>
            <dd className="mt-1 text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">Role</dt>
            <dd className="mt-1">
              <Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>{user.role}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">Status</dt>
            <dd className="mt-1">
              <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>{user.status}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 font-medium">Member since</dt>
            <dd className="mt-1 text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-gray-400">
          To update your name or email, contact an administrator.
        </p>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
        <form onSubmit={(e) => void handleChangePassword(e)} noValidate aria-label="Change password form">
          <div className="space-y-4">
            {pwErrors.general && (
              <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {pwErrors.general}
              </div>
            )}

            <FormField id="currentPassword" label="Current password" error={pwErrors.currentPassword} required>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={pwForm.currentPassword}
                onChange={updatePw('currentPassword')}
                aria-invalid={!!pwErrors.currentPassword}
                className={`input-field ${pwErrors.currentPassword ? 'input-error' : ''}`}
              />
            </FormField>

            <FormField id="newPassword" label="New password" error={pwErrors.newPassword} required>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={pwForm.newPassword}
                onChange={updatePw('newPassword')}
                aria-invalid={!!pwErrors.newPassword}
                className={`input-field ${pwErrors.newPassword ? 'input-error' : ''}`}
              />
            </FormField>

            <FormField id="confirmPassword" label="Confirm new password" error={pwErrors.confirmPassword} required>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={pwForm.confirmPassword}
                onChange={updatePw('confirmPassword')}
                aria-invalid={!!pwErrors.confirmPassword}
                className={`input-field ${pwErrors.confirmPassword ? 'input-error' : ''}`}
              />
            </FormField>

            <button type="submit" disabled={pwLoading} className="btn-primary" aria-busy={pwLoading}>
              {pwLoading ? (
                <span className="flex items-center gap-2"><Spinner size="sm" /> Updating…</span>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
