'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { WorkspaceSummary } from '@social-platform/shared-types';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { activeWorkspace, setActiveWorkspace } = useAuthStore();
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createWorkspace = useMutation({
    mutationFn: (payload: { name: string; logoUrl?: string }) =>
      apiFetch<WorkspaceSummary>('/workspaces', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (created) => {
      setActiveWorkspace(created);
      setName('');
      setLogoUrl(null);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create workspace');
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Phase 1 Foundation: Multi-tenant authentication and workspace isolation.
        </p>
      </div>

      {activeWorkspace ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {activeWorkspace.logoUrl ? (
              <img
                src={activeWorkspace.logoUrl}
                alt={activeWorkspace.name}
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">{activeWorkspace.name}</h2>
              <p className="text-xs text-slate-500">
                Slug: <code>{activeWorkspace.slug}</code> · Role:{' '}
                <span className="font-medium">{activeWorkspace.role}</span> · Timezone:{' '}
                {activeWorkspace.timezone}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-lg font-semibold">Create your first workspace</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Workspaces isolate your social accounts, team members, inbox, and tickets.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold">Create a new workspace</h3>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createWorkspace.mutate({
                name: name.trim(),
                ...(logoUrl ? { logoUrl } : {}),
              });
            }
          }}
          className="mt-4 space-y-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Workspace logo preview"
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
              />
            )}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Marketing"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />
            <label className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800">
              {logoUrl ? 'Change Logo' : 'Choose Logo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setLogoUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <button
              type="submit"
              disabled={createWorkspace.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {createWorkspace.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
