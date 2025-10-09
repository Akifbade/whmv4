
export enum UserRole {
  Admin = 'Admin',
  Supervisor = 'Supervisor',
  Worker = 'Worker',
  Billing = 'Billing',
}

export enum UserStatus {
  Pending = 'Pending',
  Active = 'Active',
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
}

export enum ShipmentStatus {
  Intake = 'Intake',
  Stored = 'Stored',
  Released = 'Released',
}

export interface Shipment {
  id: string;
  shipper: string;
  consignee: string;
  weight: number;
  pieces: number;
  arrivalDate: string;
  releaseDate?: string;
  status: ShipmentStatus;
  rackId?: string;
  invoiceId?: number; // Backend uses int
}

export enum RackStatus {
  Free = 'Free',
  Partial = 'Partial',
  Full = 'Full',
}

export interface Rack {
  id: string;
  rackLine: string;
  slot: string;
  capacity: number;
  currentLoad: number;
  status: RackStatus;
}

export interface ChargeSetting {
    id: number; // Backend uses int
    name: string;
    rate: number;
    unit: string;
}

export interface InvoiceChargeDetail {
    name: string;
    rate: number;
    quantity: number;
    unit: string;
    total: number;
}

export interface Invoice {
    id: number; // Backend uses int
    shipmentId: string;
    releaseDate: string;
    chargeDetails: InvoiceChargeDetail[];
    totalAmount: number;
    currency: string;
}