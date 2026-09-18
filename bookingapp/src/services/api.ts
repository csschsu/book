import type { Location, Timeslot, User, AssetLocation, Booked, Free, AuthSession } from '../types/models';

const API_BASE = '/api';
const AUTH_KEY = 'community_booking_auth';

/**
 * Wrapper around fetch that logs all outgoing API requests, payloads,
 * responses, and errors to the console.
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const url = input;

  let logPayload: unknown = undefined;
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body);
      if (parsed && typeof parsed === 'object' && 'password' in parsed) {
        logPayload = { ...parsed, password: '***' };
      } else {
        logPayload = parsed;
      }
    } catch {
      logPayload = init.body;
    }
  }

  if (logPayload !== undefined) {
    console.log(`[API Request] ${method} ${url}`, logPayload);
  } else {
    console.log(`[API Request] ${method} ${url}`);
  }

  try {
    const response = await fetch(input, init);
    const clone = response.clone();
    clone.text().then((text) => {
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // use raw text
      }
      if (response.ok) {
        console.log(`[API Response] ${method} ${url} (${response.status})`, data);
      } else {
        console.warn(`[API Response Error] ${method} ${url} (${response.status})`, data);
      }
    }).catch(() => {
      console.log(`[API Response] ${method} ${url} (${response.status})`);
    });
    return response;
  } catch (error) {
    console.error(`[API Network Error] ${method} ${url}`, error);
    throw error;
  }
}

// --- Authentication & Token Helpers ---

export function getAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
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

export function getAuthToken(): string | null {
  const session = getAuthSession();
  return session ? session.token : null;
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- a41: Login & a42: Logout ---

export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await apiFetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Inloggningen misslyckades (${response.status})`);
  }

  const session: AuthSession = await response.json();
  setAuthSession(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch (err) {
    console.warn('Backend logout call returned warning:', err);
  } finally {
    clearAuthSession();
  }
}

// --- OPEN Discovery Endpoints (a31, a32, a33) ---

export async function fetchAssetLocations(): Promise<AssetLocation[]> {
  const response = await apiFetch(`${API_BASE}/assetlocations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset locations: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLocations(): Promise<Location[]> {
  const response = await apiFetch(`${API_BASE}/locations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchBookedByLocation(locationId: number): Promise<Booked[]> {
  const response = await apiFetch(`${API_BASE}/booked?locationId=${locationId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch booked times: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchFreeByLocation(locationId: number): Promise<Free[]> {
  const response = await apiFetch(`${API_BASE}/free?locationId=${locationId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch free times: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchTimeslots(location: Location, startTime: string, endTime: string): Promise<Timeslot[]> {
  const url = `${API_BASE}/timeslot?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
  const response = await apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(location),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch timeslots: ${response.statusText}`);
  }
  return response.json();
}

// --- Booking (a34.1, a34.3) ---

export async function bookTime(
  freeId: number,
  userId: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const params = new URLSearchParams({
    freeId: freeId.toString(),
    userId: userId.toString(),
    startTime,
    endTime,
  });
  const url = `${API_BASE}/bookTime?${params.toString()}`;
  const response = await apiFetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to book timeslot: ${response.statusText}`);
  }
}

export async function deleteBookedTime(bookedId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/bookedTime/${bookedId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete booking: ${response.statusText}`);
  }
}

// --- Admin Free Time Management (a51: BOOKADMIN) ---

export async function fetchFreeByLocationIdAdmin(locationId: number): Promise<Free[]> {
  const response = await apiFetch(`${API_BASE}/free/${locationId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch admin free blocks: ${response.statusText}`);
  }
  return response.json();
}

export async function createFreeTimeslot(location: Location): Promise<string> {
  const response = await apiFetch(`${API_BASE}/free`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(location),
  });
  if (!response.ok) {
    throw new Error(`Failed to create free timeslot: ${response.statusText}`);
  }
  return response.text();
}

export async function addFreeTime(
  assetId: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const params = new URLSearchParams({
    assetId: assetId.toString(),
    startTime,
    endTime,
  });
  const response = await apiFetch(`${API_BASE}/freeTime?${params.toString()}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const message = errData?.error || errData?.message || `Failed to add free time: ${response.statusText}`;
    throw new Error(message);
  }
}

export async function deleteFreeTime(freeId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/freeTime/${freeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const message = errData?.error || errData?.message || `Failed to delete free time: ${response.statusText}`;
    throw new Error(message);
  }
}

// --- Admin User Management (a61, a62: BOOKADMIN) ---

export async function fetchUsers(): Promise<User[]> {
  const response = await apiFetch(`${API_BASE}/users`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  return response.json();
}

export async function addUser(user: Omit<User, 'id'> & { id?: number }): Promise<void> {
  const response = await apiFetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error(`Failed to add user: ${response.statusText}`);
  }
}
