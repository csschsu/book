export interface Address {
  email: string;
  phone: string;
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

export interface AuthSession {
  token: string;
  type: string;
  id: number;
  email: string;
  role: string;
}

export interface Asset {
  id: number;
  userId: number;
  mark: string;
  pricePerHour: number;
  blob?: string;
}

export interface AssetLocation {
  id: number;
  locationId: number;
  assetId: number;
  name: string;
}
export interface Location {
  id: number;
  name: string;
  latitude?: number;
  longitude?: number;
  address: Address;
}

export interface Booked {
  id: number;
  freeId: number;
  userId: number;
  startTime: string; // ISO-8601 String
  endTime: string;   // ISO-8601 String
}

export interface Free {
  id: number;
  assetId: number;
  startTime: string; // ISO-8601 String
  endTime: string;   // ISO-8601 String
}

export interface Timeslot {
  freeid: number;
  assetId: number;
  startTime: string; // ISO-8601 String
  endTime: string;   // ISO-8601 String
}
