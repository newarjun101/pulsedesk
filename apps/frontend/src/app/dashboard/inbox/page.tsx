'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, StickyNote } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface ConversationItem {
  id: string;
  platform: string;
  status: string;
  lastMessageAt: string;
  contact: {
    id: string;
    displayName: string;
    email: string | null;
  };
  messages: { id: string; body: string; createdAt: string }[];
}

interface MessageItem {
  id: string;
  senderType: string;
  type: string;
  body: string;
  deliveryStatus: string;
  createdAt: string;
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', workspaceId],
    queryFn: () =>
      apiFetch<ConversationItem[]>(`/workspaces/${workspaceId}/conversations`),
    enabled: Boolean(workspaceId),
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', workspaceId, selectedConvId],
    queryFn: () =>
      apiFetch<MessageItem[]>(
        `/workspaces/${workspaceId}/conversations/${selectedConvId}/messages`,
      ),
    enabled: Boolean(workspaceId && selectedConvId),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { body: string; isInternalNote: boolean }) =>
      apiFetch(
        `/workspaces/${workspaceId}/conversations/${selectedConvId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      setReplyBody('');
      setError(null);
      void queryClient.invalidateQueries({
        queryKey: ['messages', workspaceId, selectedConvId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['conversations', workspaceId],
      });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to send message');
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to view your unified inbox.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unified Inbox</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage customer messages, replies, and internal team notes.
          </p>
        </div>
      </div>

      <div className="grid min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        {/* Conversation List */}
        <div className="border-b border-slate-200 md:border-b-0 md:border-r dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800">
            Conversations ({conversations?.length ?? 0})
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-slate-500">Loading...</div>
          ) : !conversations?.length ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No conversations yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    selectedConvId === conv.id
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {conv.contact.displayName}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold dark:bg-slate-800">
                      {conv.platform}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {conv.messages[0]?.body ?? 'No messages'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Thread & Reply Composer */}
        <div className="flex flex-col md:col-span-2">
          {!selectedConvId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
              Select a conversation to view messages and reply.
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      msg.type === 'INTERNAL_NOTE'
                        ? 'ml-auto border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
                        : msg.senderType === 'AGENT'
                          ? 'ml-auto bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {msg.type === 'INTERNAL_NOTE' && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase">
                        <StickyNote className="h-3 w-3" /> Internal Note
                      </p>
                    )}
                    <p>{msg.body}</p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (replyBody.trim()) {
                    sendMutation.mutate({
                      body: replyBody.trim(),
                      isInternalNote,
                    });
                  }
                }}
                className="border-t border-slate-200 p-4 dark:border-slate-800"
              >
                {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
                <div className="mb-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                    />
                    Internal note (not sent to customer)
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={
                      isInternalNote ? 'Write an internal note...' : 'Write a reply...'
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="submit"
                    disabled={sendMutation.isPending || !replyBody.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
