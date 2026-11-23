'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, Link2, Pencil, Trash2 } from 'lucide-react';
import { PlatformBadge } from '@/components/platform-badge';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  CapabilityStatus,
  SocialPlatform,
  type SocialAccountSummary,
} from '@social-platform/shared-types';

export default function SocialAccountsPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [platform, setPlatform] = useState<SocialPlatform>(SocialPlatform.FACEBOOK);
  const [platformAccountId, setPlatformAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [username, setUsername] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPageId, setEditPageId] = useState('');
  const [editName, setEditName] = useState('');
  const [editToken, setEditToken] = useState('');

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: () =>
      apiFetch<SocialAccountSummary[]>(
        `/workspaces/${workspaceId}/social-accounts`,
      ),
    enabled: Boolean(workspaceId),
  });

  const connectManualMutation = useMutation({
    mutationFn: (payload: {
      platform: SocialPlatform;
      platformAccountId: string;
      accountName: string;
      username?: string;
      accessToken: string;
      grantedScopes: string[];
    }) =>
      apiFetch(`/workspaces/${workspaceId}/social-accounts/manual`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setPlatformAccountId('');
      setAccountName('');
      setUsername('');
      setAccessToken('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to connect account');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiFetch(`/workspaces/${workspaceId}/social-accounts/${accountId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      accountId: string;
      platformAccountId: string;
      accountName: string;
      accessToken?: string;
    }) =>
      apiFetch(`/workspaces/${workspaceId}/social-accounts/${payload.accountId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          platformAccountId: payload.platformAccountId,
          accountName: payload.accountName,
          ...(payload.accessToken ? { accessToken: payload.accessToken } : {}),
        }),
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditToken('');
      void queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage social accounts.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social Accounts</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Connect Facebook, Instagram, and TikTok accounts. Tokens are encrypted with
          AES-256-GCM and never displayed again.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-600" />
          <h2 className="text-base font-semibold">Manual Credential Configuration</h2>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (platformAccountId.trim() && accountName.trim() && accessToken.trim()) {
              connectManualMutation.mutate({
                platform,
                platformAccountId: platformAccountId.trim(),
                accountName: accountName.trim(),
                username: username.trim() || undefined,
                accessToken: accessToken.trim(),
                grantedScopes:
                  platform === SocialPlatform.FACEBOOK
                    ? ['pages_show_list', 'pages_manage_posts', 'pages_messaging']
                    : platform === SocialPlatform.INSTAGRAM
                      ? ['instagram_basic', 'instagram_content_publish']
                      : ['video.publish', 'user.info.stats'],
              });
            }
          }}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value={SocialPlatform.FACEBOOK}>Facebook Page</option>
            <option value={SocialPlatform.INSTAGRAM}>Instagram Professional</option>
            <option value={SocialPlatform.TIKTOK}>TikTok</option>
          </select>
          <input
            type="text"
            value={platformAccountId}
            onChange={(e) => setPlatformAccountId(e.target.value)}
            placeholder="Platform Account / Page ID"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account Name"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username (optional)"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Official Access Token"
            className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={connectManualMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {connectManualMutation.isPending ? 'Connecting...' : 'Save & Validate'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">Connected Accounts</h2>
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading accounts...</div>
        ) : !accounts?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No social accounts connected yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {accounts.map((acc) => (
              <div key={acc.id} className="space-y-3 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={acc.platform} />
                      <p className="text-sm font-semibold">{acc.accountName}</p>
                      {acc.username && (
                        <span className="text-xs text-slate-500">@{acc.username}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      ID: {acc.platformAccountId} · Method: {acc.connectionMethod} · Status:{' '}
                      <span className="font-medium text-emerald-600">
                        {acc.connectionStatus}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(editingId === acc.id ? null : acc.id);
                        setEditPageId(acc.platformAccountId);
                        setEditName(acc.accountName);
                        setEditToken('');
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
                      title="Edit Page ID / Name / Token"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => disconnectMutation.mutate(acc.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                      title="Disconnect account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {editingId === acc.id && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateMutation.mutate({
                        accountId: acc.id,
                        platformAccountId: editPageId,
                        accountName: editName,
                        accessToken: editToken.trim() || undefined,
                      });
                    }}
                    className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-3 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <input
                      type="text"
                      value={editPageId}
                      onChange={(e) => setEditPageId(e.target.value)}
                      placeholder="Page ID"
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Account Name"
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                      type="password"
                      value={editToken}
                      onChange={(e) => setEditToken(e.target.value)}
                      placeholder="New Access Token (optional)"
                      className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <div className="flex gap-2 md:col-span-3">
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-slate-300 px-3 py-1 text-xs dark:border-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex flex-wrap gap-2">
                  {acc.capabilities.map((cap) => (
                    <span
                      key={cap.capability}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                        cap.status === CapabilityStatus.SUPPORTED
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cap.status === CapabilityStatus.SUPPORTED && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {cap.capability}: {cap.status}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
