'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { api, ApiError } from '@/lib/api';
import { User } from '@/lib/auth';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 10;

export default function UserManagementPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && currentUser && currentUser.role !== 'ADMIN') {
      router.replace('/403');
    }
  }, [currentUser, authLoading, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search && { search }),
      });
      const res = await api.get<User[]>(`/api/admin/users?${params.toString()}`);
      setUsers(res.data ?? []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 403) {
        router.replace('/403');
      } else {
        toast.error('Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, router]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') void loadUsers();
  }, [currentUser, loadUsers]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN') => {
    setActionLoading(userId + '-role');
    try {
      await api.patch(`/api/admin/users/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'INACTIVE') => {
    setActionLoading(userId + '-status');
    try {
      await api.patch(`/api/admin/users/${userId}/status`, { status: newStatus });
      toast.success('Status updated');
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          {pagination ? `${pagination.total} total users` : 'Manage user accounts and permissions'}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2" role="search" aria-label="Search users">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          className="input-field max-w-sm"
          aria-label="Search users"
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="btn-secondary"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="lg" className="text-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500" role="status">
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Users table">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users.map((u) => {
                  const isCurrentUser = u.id === currentUser.id;
                  const loadingRole = actionLoading === u.id + '-role';
                  const loadingStatus = actionLoading === u.id + '-status';

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold" aria-hidden="true">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {u.firstName} {u.lastName}
                            {isCurrentUser && (
                              <span className="ml-1 text-xs text-gray-400">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={u.role === 'ADMIN' ? 'info' : 'neutral'}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {/* Role toggle */}
                          <button
                            onClick={() => void handleRoleChange(u.id, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                            disabled={isCurrentUser || loadingRole || !!actionLoading}
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Change ${u.firstName}'s role to ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}`}
                            title={isCurrentUser ? "Cannot change your own role" : undefined}
                          >
                            {loadingRole ? <Spinner size="sm" /> : u.role === 'ADMIN' ? '→ USER' : '→ ADMIN'}
                          </button>

                          {/* Status toggle */}
                          <button
                            onClick={() => void handleStatusChange(u.id, u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            disabled={isCurrentUser || loadingStatus || !!actionLoading}
                            className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              u.status === 'ACTIVE'
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            }`}
                            aria-label={`${u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${u.firstName}'s account`}
                            title={isCurrentUser ? "Cannot change your own status" : undefined}
                          >
                            {loadingStatus ? <Spinner size="sm" /> : u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm px-3 py-1"
                aria-label="Previous page"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-sm px-3 py-1"
                aria-label="Next page"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
