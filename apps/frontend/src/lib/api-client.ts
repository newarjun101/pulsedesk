import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    logout();
    return null;
  }

  const data = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { accessToken, activeWorkspace } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (activeWorkspace) {
    headers.set('x-workspace-id', activeWorkspace.id);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errBody = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(errBody.message)) {
        errorMessage = errBody.message.join(', ');
      } else if (errBody.message) {
        errorMessage = errBody.message;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new ApiError(response.status, errorMessage);
  }

  return (await response.json()) as T;
}
