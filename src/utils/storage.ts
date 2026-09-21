import { Mixtape } from '../types';

function getAuthHeaders(token?: string | null, includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function saveMixtapeToServer(mixtape: Mixtape, token?: string | null): Promise<Mixtape> {
  const res = await fetch('/api/mixtapes', {
    method: 'POST',
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(mixtape)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to save mixtape' }));
    throw new Error(errorData.error || 'Failed to save mixtape to Turso database');
  }

  const saved = await res.json();
  return saved as Mixtape;
}

export async function getMixtapeById(id: string, token?: string | null): Promise<Mixtape | null> {
  const res = await fetch(`/api/mixtapes/${encodeURIComponent(id)}`, {
    headers: getAuthHeaders(token, false)
  });
  if (res.ok) {
    const tape = await res.json();
    return tape as Mixtape;
  }
  if (res.status === 404) {
    return null;
  }
  const errorData = await res.json().catch(() => ({ error: 'Error loading mixtape' }));
  throw new Error(errorData.error || 'Failed to retrieve mixtape');
}

export async function fetchUserMixtapes(token?: string | null): Promise<Mixtape[]> {
  try {
    const res = await fetch('/api/my-mixtapes', {
      headers: getAuthHeaders(token, false)
    });
    if (res.ok) {
      const list = await res.json();
      return list as Mixtape[];
    }
  } catch (err) {
    console.warn('Failed to load user mixtapes:', err);
  }
  return [];
}

export async function updateMixtapeOnServer(id: string, updates: Partial<Mixtape>, token?: string | null): Promise<Mixtape> {
  const res = await fetch(`/api/mixtapes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(updates)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update mixtape' }));
    throw new Error(err.error || 'Failed to update mixtape');
  }

  return await res.json();
}

export async function deleteMixtapeFromServer(id: string, token?: string | null): Promise<boolean> {
  const res = await fetch(`/api/mixtapes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token, false)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete mixtape' }));
    throw new Error(err.error || 'Failed to delete mixtape');
  }

  return true;
}

export async function syncUserWithTurso(
  token: string,
  details?: { email?: string; displayName?: string; avatarUrl?: string }
): Promise<any> {
  const res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(details || {})
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to sync Turso user' }));
    throw new Error(err.error || 'Failed to sync Turso user');
  }

  return await res.json();
}

