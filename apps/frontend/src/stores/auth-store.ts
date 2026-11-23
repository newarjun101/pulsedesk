import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSummary, WorkspaceSummary } from '@social-platform/shared-types';

interface AuthState {
  user: UserSummary | null;
  accessToken: string | null;
  refreshToken: string | null;
  activeWorkspace: WorkspaceSummary | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (data: {
    user: UserSummary;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setActiveWorkspace: (workspace: WorkspaceSummary | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeWorkspace: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          activeWorkspace: null,
        }),
    }),
    {
      name: 'social-platform-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
