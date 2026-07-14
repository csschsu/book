import type { Location, Timeslot, User, AssetLocation } from '../types/models';

const API_BASE = '/api';

export async function fetchAssetLocations(): Promise<AssetLocation[]> {
  const response = await fetch(`${API_BASE}/assetlocations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch asset locations: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLocations(): Promise<Location[]> {
  const response = await fetch(`${API_BASE}/locations`);
  if (!response.ok) {
    throw new Error(`Failed to fetch locations: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchTimeslots(location: Location, startTime: string, endTime: string): Promise<Timeslot[]> {
  const url = `${API_BASE}/timeslot?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
  const response = await fetch(url, {
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

export async function addUser(user: Omit<User, 'id'> & { id?: number }): Promise<void> {
  const response = await fetch(`${API_BASE}/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    throw new Error(`Failed to add user: ${response.statusText}`);
  }
}

export async function fetchUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  return response.json();
}

export async function findOrCreateUser(name: string): Promise<User> {
  const response = await fetch(`${API_BASE}/user/findOrCreate?name=${encodeURIComponent(name)}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to find or create user: ${response.statusText}`);
  }
  return response.json();
}

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
  const response = await fetch(url, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to book timeslot: ${response.statusText}`);
  }
}
