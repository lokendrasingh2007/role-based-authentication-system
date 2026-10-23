'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import Spinner from './Spinner';

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold text-blue-600">
              AuthApp
            </Link>
            {user && (
              <div className="hidden sm:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Profile
                </Link>
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <Spinner size="sm" className="text-gray-400" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:block text-sm text-gray-600">
                  {user.firstName} {user.lastName}
                </span>
                <button
                  onClick={() => void logout()}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="btn-secondary text-xs px-3 py-1.5">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary text-xs px-3 py-1.5">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
