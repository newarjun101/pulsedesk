'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  PERMISSION_GROUPS,
  type RoleSummary,
} from '@social-platform/shared-types';

export default function RolesPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [name, setName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['dashboard.view']);
  const [error, setError] = useState<string | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles', workspaceId],
    queryFn: () => apiFetch<RoleSummary[]>(`/workspaces/${workspaceId}/roles`),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; permissions: string[] }) =>
      apiFetch(`/workspaces/${workspaceId}/roles`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setName('');
      setSelectedPerms(['dashboard.view']);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['roles', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) =>
      apiFetch(`/workspaces/${workspaceId}/roles/${roleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles', workspaceId] });
    },
  });

  const togglePermission = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage roles and permissions.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles &amp; Permissions</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create custom roles with granular permission matrices.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Create custom role</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createMutation.mutate({
                name: name.trim(),
                permissions: selectedPerms,
              });
            }
          }}
          className="mt-4 space-y-4"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Social Media Lead"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create Role
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
              <div
                key={group}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {group}
                </p>
                <div className="space-y-1.5">
                  {perms.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedPerms.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">Custom Roles</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading roles...</div>
        ) : !roles?.length ? (
          <div className="p-6 text-sm text-slate-500">No custom roles created yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {r.permissions.length} permission(s)
                    </p>
                  </div>
                </div>
                {!r.isSystem && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(r.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
