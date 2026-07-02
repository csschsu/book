export interface Address {
  email: string;
  phone: string;
}

export interface Supplier {
  id: number;
  name: string;
  address: Address;
}

export interface Buyer {
  id: number;
  name: string;
  address: Address;
}

export interface Asset {
  id: number;
  supplierId: number;
  description: string;
  pricePerHour: number;
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
  address: Address;
}

export interface Booked {
  id: number;
  freeId: number;
  buyerId: number;
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
