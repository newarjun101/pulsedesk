'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Building,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Shield,
  Sun,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { WorkspaceSummary } from '@social-platform/shared-types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    accessToken,
    activeWorkspace,
    _hasHydrated,
    setActiveWorkspace,
    logout,
  } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [_hasHydrated, accessToken, router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiFetch<WorkspaceSummary[]>('/workspaces'),
    enabled: Boolean(accessToken),
  });

  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !activeWorkspace) {
      setActiveWorkspace(workspaces[0]);
    }
  }, [workspaces, activeWorkspace, setActiveWorkspace]);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore error on logout
    } finally {
      logout();
      router.replace('/login');
    }
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex items-center gap-2 text-base font-bold tracking-tight text-indigo-600">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" className="fill-indigo-600" />
            <path
              d="M7 12h3l2-5 3 10 2-5h2"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          PulseDesk
        </span>
        <button
          type="button"
          onClick={() => setDarkMode((d) => !d)}
          aria-label="Toggle theme"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-indigo-600">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" className="fill-indigo-600" />
              <path
                d="M7 12h3l2-5 3 10 2-5h2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            PulseDesk
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle theme"
              className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:inline-flex dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 p-3 dark:border-slate-800">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Workspace
          </label>
          <div className="flex items-center gap-2">
            {activeWorkspace?.logoUrl && (
              <img
                src={activeWorkspace.logoUrl}
                alt={activeWorkspace.name}
                className="h-7 w-7 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-700"
              />
            )}
            <select
              value={activeWorkspace?.id ?? ''}
              onChange={(e) => {
                const found = workspaces?.find((w) => w.id === e.target.value) ?? null;
                setActiveWorkspace(found);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {workspaces?.length ? (
                workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))
              ) : (
                <option value="">No workspace</option>
              )}
            </select>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/posts"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard/posts'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Posts &amp; Composer
          </Link>
          <Link
            href="/dashboard/media"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard/media'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Media Library
          </Link>
          <Link
            href="/dashboard/inbox"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard/inbox'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Unified Inbox
          </Link>
          <Link
            href="/dashboard/tickets"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard/tickets'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Ticket className="h-4 w-4" />
            Support Tickets
          </Link>
          <div className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Management
          </div>
          <Link
            href="/dashboard/team"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Users className="h-4 w-4" />
            Team Members
          </Link>
          <Link
            href="/dashboard/departments"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Building className="h-4 w-4" />
            Departments
          </Link>
          <Link
            href="/dashboard/roles"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Shield className="h-4 w-4" />
            Roles &amp; Permissions
          </Link>
          <Link
            href="/dashboard/accounts"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Link2 className="h-4 w-4" />
            Social Accounts
          </Link>
          <Link
            href="/dashboard/analytics"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === '/dashboard/analytics'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="truncate text-xs">
              <p className="font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
