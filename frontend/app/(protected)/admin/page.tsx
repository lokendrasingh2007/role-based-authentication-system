'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import { User, AuditLog } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'ADMIN') {
      router.replace('/403');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;

    const load = async () => {
      try {
        const [usersRes, logsRes] = await Promise.all([
          api.get<User[]>('/api/admin/users?limit=100'),
          api.get<AuditLog[]>('/api/admin/audit-logs?limit=5'),
        ]);

        const users = usersRes.data ?? [];
        setStats({
          totalUsers: usersRes.pagination?.total ?? users.length,
          activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
          adminCount: users.filter((u) => u.role === 'ADMIN').length,
        });
        setRecentLogs(logsRes.data ?? []);
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 403) {
          router.replace('/403');
        }
      } finally {
        setLoadingData(false);
      }
    };

    void load();
  }, [user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">System overview and recent activity</p>
        </div>
        <Link href="/admin/users" className="btn-primary">
          Manage Users
        </Link>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center h-32">
          <Spinner size="lg" className="text-blue-600" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Users', value: stats?.totalUsers ?? 0, color: 'text-blue-600' },
              { label: 'Active Users', value: stats?.activeUsers ?? 0, color: 'text-green-600' },
              { label: 'Admins', value: stats?.adminCount ?? 0, color: 'text-purple-600' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Recent audit logs */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <li key={log.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {log.action}
                      </span>
                    </div>
                    <time className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/users" className="btn-secondary w-full mt-4 text-center text-sm">
              View all audit logs →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
