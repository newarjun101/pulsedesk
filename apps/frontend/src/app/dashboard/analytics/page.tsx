'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle2, Clock, FileText, Link2, MessageSquare, Ticket } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

interface AnalyticsOverview {
  connectedAccounts: number;
  publishing: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
  };
  inbox: {
    totalConversations: number;
  };
  tickets: {
    openTickets: number;
    resolvedTickets: number;
  };
}

interface SocialInsightItem {
  accountId: string;
  accountName: string;
  platform: string;
  reach: number;
  impressions: number;
  engagement: number;
  fans: number;
  pageViews: number;
  error: string | null;
}

export default function AnalyticsPage() {
  const activeWorkspace = useAuthStore((s) => s.activeWorkspace);
  const workspaceId = activeWorkspace?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-overview', workspaceId],
    queryFn: () =>
      apiFetch<AnalyticsOverview>(`/workspaces/${workspaceId}/analytics/overview`),
    enabled: Boolean(workspaceId),
  });

  const { data: socialInsights } = useQuery({
    queryKey: ['analytics-social', workspaceId],
    queryFn: () =>
      apiFetch<SocialInsightItem[]>(`/workspaces/${workspaceId}/analytics/social`),
    enabled: Boolean(workspaceId),
  });

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Select or create a workspace to view analytics.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time publishing, inbox, and customer support metrics for {activeWorkspace.name}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-sm text-slate-500">Loading analytics...</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/50">
          Failed to load analytics.
        </div>
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase">Connected Accounts</span>
              <Link2 className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-3xl font-bold">{data.connectedAccounts}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase">Total Posts</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-3xl font-bold">{data.publishing.totalPosts}</p>
            <p className="mt-1 text-xs text-slate-500">
              {data.publishing.publishedPosts} published · {data.publishing.scheduledPosts} scheduled
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase">Inbox Conversations</span>
              <MessageSquare className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-bold">{data.inbox.totalConversations}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium uppercase">Support Tickets</span>
              <Ticket className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-bold">{data.tickets.openTickets}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {data.tickets.openTickets} open
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {data.tickets.resolvedTickets} resolved
              </span>
            </p>
          </div>
        </div>
      ) : null}

      {socialInsights && socialInsights.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Social Media Insights (Meta)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {socialInsights.map((item) => (
              <div
                key={item.accountId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{item.accountName}</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {item.platform}
                  </span>
                </div>
                {item.error ? (
                  <p className="text-xs text-amber-600">{item.error}</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">Reach</p>
                        <p className="text-lg font-bold">{item.reach}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Impressions</p>
                        <p className="text-lg font-bold">{item.impressions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Engagement</p>
                        <p className="text-lg font-bold">{item.engagement}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Page Views</p>
                        <p className="text-lg font-bold">{item.pageViews}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-2">
                      {[
                        { label: 'Reach', value: item.reach, color: 'bg-indigo-600' },
                        { label: 'Impressions', value: item.impressions, color: 'bg-blue-500' },
                        { label: 'Engagement', value: item.engagement, color: 'bg-emerald-500' },
                        { label: 'Page Views', value: item.pageViews, color: 'bg-amber-500' },
                      ].map((bar) => {
                        const max = Math.max(
                          1,
                          item.reach,
                          item.impressions,
                          item.engagement,
                          item.pageViews,
                        );
                        const pct = Math.round((bar.value / max) * 100);
                        return (
                          <div key={bar.label} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>{bar.label}</span>
                              <span>{bar.value}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className={`h-full rounded-full ${bar.color}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
