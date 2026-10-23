'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-label="Loading dashboard">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg" aria-hidden="true">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant={user.role === 'ADMIN' ? 'info' : 'neutral'}>
              {user.role}
            </Badge>
            <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
              {user.status}
            </Badge>
          </div>
          <Link href="/profile" className="btn-secondary w-full mt-4 text-center">
            View Profile
          </Link>
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/profile" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
              → Update profile
            </Link>
            {user.role === 'ADMIN' && (
              <>
                <Link href="/admin" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  → Admin dashboard
                </Link>
                <Link href="/admin/users" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  → Manage users
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Account info */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Account Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Member since</dt>
              <dd className="font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last updated</dt>
              <dd className="font-medium text-gray-900">
                {new Date(user.updatedAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Role</dt>
              <dd className="font-medium text-gray-900">{user.role}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
