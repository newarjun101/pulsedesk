'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { DepartmentSummary } from '@social-platform/shared-types';

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', workspaceId],
    queryFn: () =>
      apiFetch<DepartmentSummary[]>(`/workspaces/${workspaceId}/departments`),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiFetch(`/workspaces/${workspaceId}/departments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['departments', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (departmentId: string) =>
      apiFetch(`/workspaces/${workspaceId}/departments/${departmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage departments.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organize your team into functional groups like Marketing, Sales, and Support.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Create department</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              createMutation.mutate({
                name: name.trim(),
                description: description.trim() || undefined,
              });
            }
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department name"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading departments...</div>
        ) : !departments?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No departments yet. Create your first department above.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium">{dept.name}</p>
                    {dept.description && (
                      <p className="text-xs text-slate-500">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    {dept.memberCount} member(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(dept.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                    title="Delete department"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
