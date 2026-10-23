import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: '403 Forbidden' };

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-red-200 select-none" aria-hidden="true">403</div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h1>
        <p className="mt-2 text-gray-500 text-sm">
          You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/login" className="btn-secondary">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
