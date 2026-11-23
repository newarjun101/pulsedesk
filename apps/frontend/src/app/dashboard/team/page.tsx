'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  WorkspaceRole,
  type InvitationSummary,
  type MemberSummary,
} from '@social-platform/shared-types';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.SUPPORT_AGENT);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = activeWorkspace?.id;

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => apiFetch<MemberSummary[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });

  const { data: invitations } = useQuery({
    queryKey: ['invitations', workspaceId],
    queryFn: () =>
      apiFetch<InvitationSummary[]>(`/workspaces/${workspaceId}/invitations`),
    enabled: Boolean(workspaceId),
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string; role: WorkspaceRole }) =>
      apiFetch(`/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setEmail('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['invitations', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to send invitation');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage team members.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Members</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Invite teammates and manage workspace roles.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Invite a member</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) {
              inviteMutation.mutate({ email: email.trim(), role });
            }
          }}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {Object.values(WorkspaceRole)
              .filter((r) => r !== WorkspaceRole.WORKSPACE_OWNER)
              .map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
          </select>
          <button
            type="submit"
            disabled={inviteMutation.isPending || !email.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">Active Members</h2>
        </div>
        {membersLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading members...</div>
        ) : !members?.length ? (
          <div className="p-6 text-sm text-slate-500">No members found.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {m.role}
                  </span>
                  <span className="text-xs text-slate-500">{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {invitations && invitations.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold">Pending Invitations</h2>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-xs text-slate-500">Role: {inv.role}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate(inv.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                  title="Revoke invitation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
