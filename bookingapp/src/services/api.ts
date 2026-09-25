import { AuthSession, Location, Asset, AssetLocation, Free, Booked, Timeslot, User } from '../types/models';

const API_BASE = '/api';
const AUTH_KEY = 'community_booking_auth';

export function getAuthSession(): AuthSession | null {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data) as AuthSession;
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_KEY);
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
  const session = await handleResponse<AuthSession>(res);
  setAuthSession(session);
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

