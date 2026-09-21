export interface Address {
  email: string;
  phone: string;
}

export interface AuthSession {
  token: string;
  type: string;
  id: number;
  email: string;
  role: string;
}

export interface Location {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  address: Address;
}

export interface AssetLocation {
  id: number;
  locationId: number;
  assetId: number;
  name: string;
}

export interface Free {
  id: number;
  assetId: number;
  startTime: string;
  endTime: string;
}

export interface Booked {
  id: number;
  freeId: number;
  userId: number;
  userEmail?: string;
  startTime: string;
  endTime: string;
}

export interface Timeslot {
  freeid: number;
  assetId: number;
  startTime: string;
  endTime: string;
}

export interface User {
  id: number;
  email: string;
  password?: string;
  code: number;
  createtime?: string;
  role: string;
  address?: Address;
}

