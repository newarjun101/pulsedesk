'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Plus, Ticket as TicketIcon, UserCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { MemberSummary } from '@social-platform/shared-types';

interface TicketItem {
  id: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: string;
  assignedToId: string | null;
  slaDeadline: string | null;
  createdAt: string;
}

const PRIORITY_STYLES: Record<TicketItem['priority'], string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
  NORMAL: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const COLUMNS = [
  { key: 'OPEN', label: 'To Do / Open', accent: 'border-t-blue-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: 'border-t-amber-500' },
  { key: 'RESOLVED', label: 'Resolved', accent: 'border-t-emerald-500' },
  { key: 'CLOSED', label: 'Closed', accent: 'border-t-slate-400' },
];

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [error, setError] = useState<string | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', workspaceId],
    queryFn: () => apiFetch<TicketItem[]>(`/workspaces/${workspaceId}/tickets`),
    enabled: Boolean(workspaceId),
  });

  const { data: members } = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => apiFetch<MemberSummary[]>(`/workspaces/${workspaceId}/members`),
    enabled: Boolean(workspaceId),
  });

  const { data: ticketStats } = useQuery({
    queryKey: ['ticket-analytics', workspaceId],
    queryFn: () =>
      apiFetch<{ total: number; open: number; resolved: number }>(
        `/workspaces/${workspaceId}/analytics/tickets`,
      ),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      subject: string;
      description: string;
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    }) =>
      apiFetch(`/workspaces/${workspaceId}/tickets`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setPriority('NORMAL');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create ticket');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { ticketId: string; status: string }) =>
      apiFetch(`/workspaces/${workspaceId}/tickets/${payload.ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { ticketId: string; assignedToId: string | null }) =>
      apiFetch(`/workspaces/${workspaceId}/tickets/${payload.ticketId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToId: payload.assignedToId }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets', workspaceId] });
    },
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to manage support tickets.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <TicketIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Support Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Jira-style ticket board with priority badges, SLA tracking, and team assignment.
            </p>
          </div>
        </div>
        {ticketStats && (
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-900">
              Total: <strong>{ticketStats.total}</strong>
            </span>
            <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300">
              Open: <strong>{ticketStats.open}</strong>
            </span>
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
              Resolved: <strong>{ticketStats.resolved}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">Create Issue / Ticket</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (subject.trim() && description.trim()) {
              createMutation.mutate({
                subject: subject.trim(),
                description: description.trim(),
                priority,
              });
            }
          }}
          className="mt-3 grid gap-3 md:grid-cols-4"
        >
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Issue summary / subject"
            className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT')
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="LOW">LOW</option>
            <option value="NORMAL">NORMAL</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
          <button
            type="submit"
            disabled={createMutation.isPending || !subject.trim() || !description.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the customer issue..."
            className="md:col-span-4 rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </form>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading board...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTickets = (tickets ?? []).filter((t) =>
              col.key === 'OPEN'
                ? t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'REOPENED'
                : t.status === col.key,
            );
            return (
              <div
                key={col.key}
                className={`flex flex-col rounded-xl border border-slate-200 border-t-4 ${col.accent} bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/60`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    {colTickets.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colTickets.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                      No tickets
                    </div>
                  ) : (
                    colTickets.map((t) => (
                      <div
                        key={t.id}
                        className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">{t.subject}</p>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[t.priority]}`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-500">
                          {t.description}
                        </p>
                        {t.slaDeadline && (
                          <p className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            SLA: {new Date(t.slaDeadline).toLocaleDateString()}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3 shrink-0 text-slate-400" />
                            <select
                              value={t.assignedToId ?? ''}
                              onChange={(e) =>
                                assignMutation.mutate({
                                  ticketId: t.id,
                                  assignedToId: e.target.value || null,
                                })
                              }
                              className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                            >
                              <option value="">Unassigned</option>
                              {members?.map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.firstName} {m.lastName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <select
                            value={t.status}
                            onChange={(e) =>
                              statusMutation.mutate({
                                ticketId: t.id,
                                status: e.target.value,
                              })
                            }
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-950"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
