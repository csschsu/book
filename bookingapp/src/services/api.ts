import { AuthSession, Location, Asset, AssetLocation, Free, Booked, Timeslot, User } from '../types/models';

const API_BASE = '/api';
const AUTH_KEY = 'community_booking_auth';
const SESSION_FLAG_KEY = 'community_booking_session_active';

export function isTokenExpired(token?: string): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function initSessionCheck(): void {
  if (typeof window === 'undefined') return;
  try {
    const isExistingSession = sessionStorage.getItem(SESSION_FLAG_KEY) === 'true';
    if (!isExistingSession) {
      // New session detected - clear email, role, and JWT token
      clearAuthSession();
      sessionStorage.setItem(SESSION_FLAG_KEY, 'true');
    }
  } catch {
    // Ignore storage errors if disabled
  }
}

// Perform session detection on initialization
initSessionCheck();

export function getAuthSession(): AuthSession | null {
  initSessionCheck();
  try {
    const data = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
    if (!data) return null;
    const session = JSON.parse(data) as AuthSession;
    if (!session || !session.token || isTokenExpired(session.token)) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  try {
    sessionStorage.setItem(SESSION_FLAG_KEY, 'true');
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
    // Clear localStorage to prevent leaking across browser sessions
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getAuthHeaders(): HeadersInit {
  const session = getAuthSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent('auth-expired'));
    throw new Error('Din inloggningssession har gått ut. Vänligen logga in igen.');
  }
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      } else if (errJson && errJson.message) {
        errorMsg = errJson.message;
      }
    } catch {
      // not json
    }
    if (res.status === 403) {
      errorMsg = 'Åtkomst nekad (403): Du saknar behörighet eller din session har gått ut. Logga in igen vid behov.';
    }
    throw new Error(errorMsg);
  }
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function login(identifier: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    let errorMsg = 'Inloggningen misslyckades. Kontrollera uppgifterna.';
    try {
      const errJson = await res.json();
      if (errJson?.error) {
        errorMsg = errJson.error;
      } else if (errJson?.message) {
        errorMsg = errJson.message;
      }
    } catch {
      if (res.status === 401) {
        errorMsg = 'Felaktigt användarnamn eller lösenord.';
      }
    }
    throw new Error(errorMsg);
  }

  const session = (await res.json()) as AuthSession;
  setAuthSession(session);
  window.dispatchEvent(new CustomEvent('auth-login-success', { detail: session }));
  return session;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } finally {
    clearAuthSession();
  }
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${API_BASE}/location`);
  return handleResponse<Location[]>(res);
}

export async function fetchAssetLocations(): Promise<AssetLocation[]> {
  const res = await fetch(`${API_BASE}/assets`);
  return handleResponse<AssetLocation[]>(res);
}

export async function fetchFreeByLocation(locationId: number): Promise<Free[]> {
  const res = await fetch(`${API_BASE}/free?locationId=${locationId}`);
  return handleResponse<Free[]>(res);
}

export async function fetchBookedByLocation(locationId: number): Promise<Booked[]> {
  const res = await fetch(`${API_BASE}/booked/${locationId}`);
  return handleResponse<Booked[]>(res);
}

export async function fetchTimeslots(
  location: Location,
  startTime?: string,
  endTime?: string
): Promise<Timeslot[]> {
  let url = `${API_BASE}/timeslot`;
  const params = new URLSearchParams();
  if (startTime) params.append('startTime', startTime);
  if (endTime) params.append('endTime', endTime);
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
  return handleResponse<Timeslot[]>(res);
}

export async function bookTime(
  freeId: number,
  userId: number,
  startTime: string,
  endTime: string
): Promise<{ id: number; message: string }> {
  const params = new URLSearchParams({
    freeId: String(freeId),
    userId: String(userId),
    startTime,
    endTime,
  });
  const res = await fetch(`${API_BASE}/bookTime?${params.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: number; message: string }>(res);
}

export async function deleteBookedTime(bookedId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/bookedTime/${bookedId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchFreeByLocationIdAdmin(locationId: number): Promise<Free[]> {
  const res = await fetch(`${API_BASE}/free/${locationId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Free[]>(res);
}

export async function fetchFreeByAssetIdAdmin(assetId: number): Promise<Free[]> {
  const res = await fetch(`${API_BASE}/free/asset/${assetId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Free[]>(res);
}

export async function addFreeTime(
  assetId: number,
  startTime: string,
  endTime: string
): Promise<{ id: number; message: string }> {
  const params = new URLSearchParams({
    assetId: String(assetId),
    startTime,
    endTime,
  });
  const res = await fetch(`${API_BASE}/freeTime?${params.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: number; message: string }>(res);
}

export async function updateFreeTime(
  freeId: number,
  startTime: string,
  endTime: string
): Promise<{ id: number; message: string }> {
  const params = new URLSearchParams({
    startTime,
    endTime,
  });
  const res = await fetch(`${API_BASE}/freeTime/${freeId}?${params.toString()}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ id: number; message: string }>(res);
}

export async function deleteFreeTime(freeId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/freeTime/${freeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<User[]>(res);
}

export async function addUser(user: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });
  return handleResponse<User>(res);
}

export async function updateUser(id: number, user: Partial<User>): Promise<User> {
  const res = await fetch(`${API_BASE}/user/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });
  return handleResponse<User>(res);
}

export async function createLocation(location: Partial<Location>): Promise<Location> {
  const res = await fetch(`${API_BASE}/location`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(location),
  });
  return handleResponse<Location>(res);
}

export async function updateLocation(id: number, location: Partial<Location>): Promise<Location> {
  const res = await fetch(`${API_BASE}/location/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(location),
  });
  return handleResponse<Location>(res);
}

export async function deleteLocation(locationId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/location/${locationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchAssets(locationId?: number): Promise<Asset[]> {
  const url = locationId != null ? `${API_BASE}/assets?locationId=${locationId}` : `${API_BASE}/assets`;
  const res = await fetch(url);
  return handleResponse<Asset[]>(res);
}

export async function fetchAssetsByLocation(locationId: number): Promise<Asset[]> {
  return fetchAssets(locationId);
}

export async function createAsset(
  locationId: number,
  asset: Partial<Asset> | string,
  pricePerHour?: number,
  mark?: string
): Promise<Asset> {
  const payload = typeof asset === 'string'
    ? { name: asset, pricePerHour, mark }
    : { ...asset };
  const res = await fetch(`${API_BASE}/location/${locationId}/asset`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<Asset>(res);
}

export async function updateAsset(
  assetId: number,
  asset: Partial<Asset>
): Promise<Asset> {
  const res = await fetch(`${API_BASE}/asset/${assetId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(asset),
  });
  return handleResponse<Asset>(res);
}

export async function deleteAsset(assetId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/asset/${assetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse<{ success: boolean }>(res);
}
