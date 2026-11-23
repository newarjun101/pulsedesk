'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  MediaType,
  type MediaAssetSummary,
  type PaginatedResponse,
} from '@social-platform/shared-types';

export default function MediaLibraryPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [page, setPage] = useState(1);
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>(MediaType.IMAGE);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['media', workspaceId, page],
    queryFn: () =>
      apiFetch<PaginatedResponse<MediaAssetSummary>>(
        `/workspaces/${workspaceId}/media?page=${page}&limit=9`,
      ),
    enabled: Boolean(workspaceId),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      mediaType: MediaType;
      url: string;
    }) =>
      apiFetch(`/workspaces/${workspaceId}/media`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setFileName('');
      setUrl('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to add media');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: string) =>
      apiFetch(`/workspaces/${workspaceId}/media/${mediaId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { mediaId: string; fileName: string; url: string }) =>
      apiFetch(`/workspaces/${workspaceId}/media/${payload.mediaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fileName: payload.fileName, url: payload.url }),
      }),
    onSuccess: () => {
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['media', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage media.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage images and videos for your social posts.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold">Add Media Asset</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (fileName.trim() && url.trim()) {
              registerMutation.mutate({
                fileName: fileName.trim(),
                mimeType: mediaType === MediaType.IMAGE ? 'image/jpeg' : 'video/mp4',
                sizeBytes: 102400,
                mediaType,
                url: url.trim(),
              });
            }
          }}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaType)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value={MediaType.IMAGE}>Image</option>
            <option value={MediaType.VIDEO}>Video</option>
          </select>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="File name (e.g. promo.jpg)"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Media
          </button>
        </form>
      </div>

      {mediaData && mediaData.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Total: {mediaData.total} asset(s)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Page {mediaData.page} of {mediaData.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= mediaData.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-300 p-1 disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading media...</p>
        ) : !mediaData?.items?.length ? (
          <p className="text-sm text-slate-500">No media assets yet.</p>
        ) : (
          mediaData.items.map((asset) => (
            <div
              key={asset.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                  {asset.mediaType === MediaType.IMAGE ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  {asset.mediaType}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(editingId === asset.id ? null : asset.id);
                      setEditName(asset.fileName);
                      setEditUrl(asset.url);
                    }}
                    className="text-slate-400 hover:text-indigo-600"
                    title="Edit media"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(asset.id)}
                    className="text-slate-400 hover:text-red-600"
                    title="Delete media"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mb-3 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                {asset.mediaType === MediaType.IMAGE ? (
                  <img
                    src={asset.url}
                    alt={asset.fileName}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <video
                    src={asset.url}
                    controls
                    className="h-40 w-full object-cover"
                  />
                )}
              </div>
              <p className="truncate text-sm font-medium">{asset.fileName}</p>
              <p className="truncate text-xs text-slate-500">{asset.mimeType}</p>
              {editingId === asset.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate({
                      mediaId: asset.id,
                      fileName: editName,
                      url: editUrl,
                    });
                  }}
                  className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="File name"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="URL"
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
