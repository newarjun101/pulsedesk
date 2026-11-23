'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Save, Send, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  MediaType,
  PostStatus,
  type MediaAssetSummary,
  type PaginatedResponse,
  type SocialPostSummary,
} from '@social-platform/shared-types';

interface PostDetailResponse extends SocialPostSummary {
  media?: { id: string; mediaAssetId: string; mediaAsset: MediaAssetSummary }[];
  logs?: { id: string; status: string; message: string; createdAt: string }[];
}

interface PostCommentItem {
  id: string;
  platform: string;
  authorId: string | null;
  authorName: string;
  authorAvatar: string | null;
  profileUrl: string | null;
  message: string;
  createdAt: string;
  replies?: {
    id: string;
    authorId: string | null;
    authorName: string;
    authorAvatar: string | null;
    message: string;
    createdAt: string;
  }[];
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [content, setContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', workspaceId, postId],
    queryFn: () =>
      apiFetch<PostDetailResponse>(`/workspaces/${workspaceId}/posts/${postId}`),
    enabled: Boolean(workspaceId && postId),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['post-comments', workspaceId, postId, commentPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<PostCommentItem>>(
        `/workspaces/${workspaceId}/posts/${postId}/comments?page=${commentPage}&limit=5`,
      ),
    enabled: Boolean(workspaceId && postId),
  });

  const updateCommentMutation = useMutation({
    mutationFn: (payload: { commentId: string; message: string }) =>
      apiFetch(
        `/workspaces/${workspaceId}/posts/${postId}/comments/${payload.commentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ message: payload.message }),
        },
      ),
    onSuccess: () => {
      setEditingCommentId(null);
      void queryClient.invalidateQueries({
        queryKey: ['post-comments', workspaceId, postId],
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['post-comments', workspaceId, postId],
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    onSuccess: () => {
      setNewComment('');
      void queryClient.invalidateQueries({
        queryKey: ['post-comments', workspaceId, postId],
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (payload: { commentId: string; message: string }) =>
      apiFetch(
        `/workspaces/${workspaceId}/posts/${postId}/comments/${payload.commentId}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ message: payload.message }),
        },
      ),
    onSuccess: (_, vars) => {
      setReplyText((prev) => ({ ...prev, [vars.commentId]: '' }));
      void queryClient.invalidateQueries({
        queryKey: ['post-comments', workspaceId, postId],
      });
    },
  });

  const { data: mediaData } = useQuery({
    queryKey: ['media', workspaceId],
    queryFn: () =>
      apiFetch<PaginatedResponse<MediaAssetSummary>>(
        `/workspaces/${workspaceId}/media?page=1&limit=50`,
      ),
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setSelectedMedia(post.media?.map((m) => m.mediaAssetId) ?? []);
    }
  }, [post]);

  const updateMutation = useMutation({
    mutationFn: (payload: { content: string; mediaAssetIds: string[] }) =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['post', workspaceId, postId] });
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to update post');
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/publish`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['post', workspaceId, postId] });
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}/duplicate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
      router.push('/dashboard/posts');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/workspaces/${workspaceId}/posts/${postId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] });
      router.push('/dashboard/posts');
    },
  });

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/posts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Posts
      </Link>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading post details...
        </div>
      ) : !post ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-red-600 dark:border-slate-800 dark:bg-slate-900">
          Post not found.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-semibold">Post Details</h1>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                {post.status}
              </span>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
            />

            <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">
                    Attached Photos / Videos
                  </span>
                  <label className="cursor-pointer rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300">
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
                          const dataUrl = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(String(reader.result));
                            reader.onerror = () => reject(new Error('Read failed'));
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
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mediaData?.items?.map((asset) => (
                    <label
                      key={asset.id}
                      className="flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700"
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
                      <span>{asset.fileName}</span>
                    </label>
                  ))}
                </div>
              </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateMutation.mutate({ content, mediaAssetIds: selectedMedia })
                }
                disabled={updateMutation.isPending || !content.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <Send className="h-3.5 w-3.5" />
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => duplicateMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium dark:border-slate-700"
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-base font-semibold">Platform Targets</h2>
            <div className="space-y-2">
              {post.targets.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-xs dark:border-slate-800"
                >
                  <span className="font-semibold">{t.platform}</span>
                  <span>Status: {t.status}</span>
                  {t.externalPostId && <span>External ID: {t.externalPostId}</span>}
                  {t.error && <span className="text-red-600">{t.error}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Comments &amp; Replies ({commentsData?.total ?? 0})
              </h2>
              {commentsData && commentsData.totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={commentPage <= 1}
                    onClick={() => setCommentPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-700"
                  >
                    Prev
                  </button>
                  <span>
                    Page {commentsData.page} of {commentsData.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={commentPage >= commentsData.totalPages}
                    onClick={() => setCommentPage((p) => p + 1)}
                    className="rounded border border-slate-300 px-2 py-0.5 disabled:opacity-40 dark:border-slate-700"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newComment.trim()) {
                  addCommentMutation.mutate(newComment.trim());
                }
              }}
              className="mb-4 flex flex-wrap gap-2"
            >
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment on this post..."
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-950"
              />
              {['👍', '❤️', '🎉', '🙏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewComment((prev) => `${prev}${emoji}`)}
                  className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-700"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="submit"
                disabled={addCommentMutation.isPending || !newComment.trim()}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {addCommentMutation.isPending ? 'Posting...' : 'Comment'}
              </button>
            </form>
            {!commentsData?.items?.length ? (
              <p className="text-xs text-slate-500">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {commentsData.items.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {c.authorAvatar ? (
                          <img
                            src={c.authorAvatar}
                            alt={c.authorName}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                            {c.authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold">{c.authorName}</span>
                        {c.profileUrl && (
                          <a
                            href={c.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-600 hover:underline"
                          >
                            Visit Profile
                          </a>
                        )}
                        <Link
                          href="/dashboard/inbox"
                          className="text-[11px] text-emerald-600 hover:underline"
                        >
                          Message User
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setReplyText((prev) => ({
                              ...prev,
                              [c.id]: `${prev[c.id] ?? ''}@${c.authorName} `,
                            }))
                          }
                          className="text-[11px] text-slate-500 hover:text-indigo-600"
                        >
                          @Mention
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(editingCommentId === c.id ? null : c.id);
                            setEditCommentText(c.message);
                          }}
                          className="text-[11px] text-slate-500 hover:text-indigo-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCommentMutation.mutate(c.id)}
                          className="text-[11px] text-slate-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                        <span className="text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {editingCommentId === c.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editCommentText.trim()) {
                            updateCommentMutation.mutate({
                              commentId: c.id,
                              message: editCommentText.trim(),
                            });
                          }
                        }}
                        className="mt-2 flex gap-2"
                      >
                        <input
                          type="text"
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                        />
                        <button
                          type="submit"
                          className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                      </form>
                    ) : (
                      <p className="mt-1 text-sm">{c.message}</p>
                    )}
                    {c.replies && c.replies.length > 0 && (
                      <div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
                        {c.replies.map((r) => (
                          <div key={r.id} className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{r.authorName}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReplyText((prev) => ({
                                      ...prev,
                                      [r.id]: prev[r.id] ?? `@${r.authorName} `,
                                    }))
                                  }
                                  className="text-[10px] text-indigo-600 hover:underline"
                                >
                                  Reply
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteCommentMutation.mutate(r.id)}
                                  className="text-[10px] text-slate-400 hover:text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300">
                              {r.message}
                            </p>
                            {replyText[r.id] !== undefined && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const msg = replyText[r.id]?.trim();
                                  if (msg) {
                                    replyMutation.mutate({ commentId: r.id, message: msg });
                                    setReplyText((prev) => {
                                      const next = { ...prev };
                                      delete next[r.id];
                                      return next;
                                    });
                                  }
                                }}
                                className="flex gap-2 pt-1"
                              >
                                <input
                                  type="text"
                                  value={replyText[r.id] ?? ''}
                                  onChange={(e) =>
                                    setReplyText((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Reply to ${r.authorName}...`}
                                  className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                                />
                                <button
                                  type="submit"
                                  disabled={replyMutation.isPending}
                                  className="rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-indigo-700"
                                >
                                  Send
                                </button>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const msg = replyText[c.id]?.trim();
                        if (msg) {
                          replyMutation.mutate({ commentId: c.id, message: msg });
                        }
                      }}
                      className="mt-2 flex gap-2"
                    >
                      <input
                        type="text"
                        value={replyText[c.id] ?? ''}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        placeholder="Write a reply..."
                        className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                      />
                      <button
                        type="submit"
                        disabled={replyMutation.isPending}
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Reply
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

          {post.logs && post.logs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-base font-semibold">Publishing Logs</h2>
              <div className="space-y-2 text-xs">
                {post.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800"
                  >
                    <span>
                      <strong>{log.status}</strong>: {log.message}
                    </span>
                    <span className="text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
