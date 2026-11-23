'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Copy, Image as ImageIcon, RefreshCw, Send, Trash2, Video } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  MediaType,
  type MediaAssetSummary,
  type PaginatedResponse,
  type SocialAccountSummary,
  type SocialPostSummary,
} from '@social-platform/shared-types';

export default function PostsPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [liTopic, setLiTopic] = useState('');
  const [liPreview, setLiPreview] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: () =>
      apiFetch<SocialAccountSummary[]>(`/workspaces/${workspaceId}/social-accounts`),
    enabled: Boolean(workspaceId),
  });

  const { data: mediaData } = useQuery({
    queryKey: ['media', workspaceId],
    queryFn: () =>
      apiFetch<PaginatedResponse<MediaAssetSummary>>(
        `/workspaces/${workspaceId}/media?page=1&limit=50`,
      ),
    enabled: Boolean(workspaceId),
  });
  const mediaAssets = mediaData?.items;

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['posts', workspaceId, page, search, filterPlatform, filterStatus, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        sort: sortOrder,
      });
      if (search.trim()) params.set('search', search.trim());
      if (filterPlatform) params.set('platform', filterPlatform);
      if (filterStatus) params.set('status', filterStatus);
      return apiFetch<PaginatedResponse<SocialPostSummary>>(
        `/workspaces/${workspaceId}/posts?${params.toString()}`,
      );
    },
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      content: string;
      socialAccountIds: string[];
      mediaAssetIds?: string[];
      scheduledAt?: string;
    }) =>
      apiFetch(`/workspaces/${workspaceId}/posts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setContent('');
      setSelectedAccounts([]);
      setSelectedMedia([]);
      setScheduledAt('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create post');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/duplicate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/workspaces/${workspaceId}/social-accounts/sync`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage posts.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Posts &amp; Composer</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create drafts, attach images/videos, schedule content, and publish to Facebook,
            Instagram, and TikTok.
          </p>
        </div>
        <button
          type="button"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Posts & Messages'}
        </button>
      </div>

      {/* LinkedIn Poster */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-sky-700 dark:text-sky-400">
          LinkedIn Poster
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Generate a structured LinkedIn post with hook, key takeaways, and hashtags.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={liTopic}
            onChange={(e) => setLiTopic(e.target.value)}
            placeholder="Enter topic (e.g. Launching our new AI support workflow)"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            disabled={!liTopic.trim()}
            onClick={() => {
              const t = liTopic.trim();
              setLiPreview(
                `🚀 ${t}\n\nHere are 3 key takeaways from what we built:\n• Faster response times across every channel\n• Unified team collaboration with clear ownership\n• Measurable results from day one\n\nWhat's your biggest challenge with ${t.toLowerCase()}? Let's discuss below. 👇\n\n#SaaS #Productivity #SocialMedia #Growth`,
              );
            }}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Generate LinkedIn Post
          </button>
        </div>
        {liPreview && (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-line dark:border-slate-800 dark:bg-slate-950">
            {liPreview}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContent(liPreview)}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Use in Composer
              </button>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(liPreview)}
                className="rounded border border-slate-300 px-3 py-1 text-xs dark:border-slate-700"
              >
                Copy Text
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Compose Post</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (content.trim() && selectedAccounts.length > 0) {
              createMutation.mutate({
                content: content.trim(),
                socialAccountIds: selectedAccounts,
                mediaAssetIds: selectedMedia.length ? selectedMedia : undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
              });
            }
          }}
          className="mt-4 space-y-4"
        >
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your post caption..."
            className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          />

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Target Accounts</p>
            <div className="flex flex-wrap gap-2">
              {accounts?.length ? (
                accounts.map((acc) => (
                  <label
                    key={acc.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(acc.id)}
                      onChange={() =>
                        setSelectedAccounts((prev) =>
                          prev.includes(acc.id)
                            ? prev.filter((id) => id !== acc.id)
                            : [...prev, acc.id],
                        )
                      }
                    />
                    <span>
                      {acc.platform}: {acc.accountName}
                    </span>
                  </label>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  Connect a social account first.
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">
                Attach Photos / Videos
              </p>
              <label className="cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
                + Upload Photo / Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    for (const file of files) {
                      const isVideo = file.type.startsWith('video/');
                      try {
                        const dataUrl = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(String(reader.result));
                          reader.onerror = () => reject(new Error('Failed to read file'));
                          reader.readAsDataURL(file);
                        });
                        const created = await apiFetch<MediaAssetSummary>(
                          `/workspaces/${workspaceId}/media`,
                          {
                            method: 'POST',
                            body: JSON.stringify({
                              fileName: file.name,
                              mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
                              sizeBytes: Math.max(1, file.size),
                              mediaType: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
                              url: dataUrl,
                            }),
                          },
                        );
                        setSelectedMedia((prev) => [...prev, created.id]);
                        void queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
                      } catch {
                        setError(`Failed to attach ${file.name}`);
                      }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {mediaAssets?.length ? (
                mediaAssets.map((asset) => (
                  <label
                    key={asset.id}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMedia.includes(asset.id)}
                      onChange={() =>
                        setSelectedMedia((prev) =>
                          prev.includes(asset.id)
                            ? prev.filter((id) => id !== asset.id)
                            : [...prev, asset.id],
                        )
                      }
                    />
                    {asset.mediaType === MediaType.IMAGE ? (
                      <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                    ) : (
                      <Video className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    <span>{asset.fileName}</span>
                  </label>
                ))
              ) : (
                <span className="text-xs text-slate-400">
                  No media assets yet. Add images or videos in Media Library.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">
                Schedule (Optional):
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
              {scheduledAt && (
                <button
                  type="button"
                  onClick={() => setScheduledAt('')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                !content.trim() ||
                selectedAccounts.length === 0
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {scheduledAt ? 'Schedule Post' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Dynamic Platform Tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-6 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setFilterPlatform('');
              setPage(1);
            }}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
              filterPlatform === ''
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            All Platforms
          </button>
          {Array.from(new Set((accounts ?? []).map((a) => a.platform))).map((plat) => (
            <button
              key={plat}
              type="button"
              onClick={() => {
                setFilterPlatform(plat);
                setPage(1);
              }}
              className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
                filterPlatform === plat
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold">
            All Posts ({postsData?.total ?? 0})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search posts..."
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
            />
            <select
              value={filterPlatform}
              onChange={(e) => {
                setFilterPlatform(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All Platforms</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="FAILED">FAILED</option>
              <option value="PARTIALLY_PUBLISHED">PARTIALLY_PUBLISHED</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'desc' | 'asc');
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="desc">Newest First (DESC)</option>
              <option value="asc">Oldest First (ASC)</option>
            </select>
          </div>
          {postsData && postsData.totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Page {postsData.page} of {postsData.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= postsData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading posts...</div>
        ) : !postsData?.items?.length ? (
          <div className="p-8 text-center text-sm text-slate-500">No posts yet.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {postsData.items.map((post) => (
              <div key={post.id} className="space-y-2 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm">{post.content}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium dark:bg-slate-800">
                    {post.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.targets.map((t) => (
                    <span
                      key={t.id}
                      className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800"
                    >
                      {t.platform}: {t.status}
                      {t.error ? ` (${t.error})` : ''}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/dashboard/posts/${post.id}`}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    View / Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => publishMutation.mutate(post.id)}
                    className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Send className="h-3 w-3" />
                    Publish Now
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateMutation.mutate(post.id)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(post.id)}
                    className="inline-flex items-center gap-1 rounded p-1 text-xs text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
