import type { Location, Timeslot, Buyer, AssetLocation } from '../types/models';

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

export async function addBuyer(buyer: Omit<Buyer, 'id'> & { id?: number }): Promise<void> {
  const response = await fetch(`${API_BASE}/buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buyer),
  });

  if (!response.ok) {
    throw new Error(`Failed to add buyer: ${response.statusText}`);
  }
}

export async function fetchBuyers(): Promise<Buyer[]> {
  const response = await fetch(`${API_BASE}/buyers`);
  if (!response.ok) {
    throw new Error(`Failed to fetch buyers: ${response.statusText}`);
  }
  return response.json();
}

export async function findOrCreateBuyer(name: string): Promise<Buyer> {
  const response = await fetch(`${API_BASE}/buyer/findOrCreate?name=${encodeURIComponent(name)}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to find or create buyer: ${response.statusText}`);
  }
  return response.json();
}

export async function bookTime(
  freeId: number,
  buyerId: number,
  startTime: string,
  endTime: string
): Promise<void> {
  const params = new URLSearchParams({
    freeId: freeId.toString(),
    buyerId: buyerId.toString(),
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
