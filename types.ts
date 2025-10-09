export enum ShipmentStatus {
  Intake = 'Intake',
  Stored = 'Stored',
  Released = 'Released',
}

export enum RackStatus {
  Free = 'Free',
  Partial = 'Partial',
  Full = 'Full',
}

export enum UserRole {
    Admin = 'Admin',
    Supervisor = 'Supervisor',
    Worker = 'Worker',
    Billing = 'Billing',
}

export interface User {
    id: number;
    username: string;
    role: UserRole;
}

export interface Shipment {
  id: string;
  shipper: string;
  consignee: string;
  weight: number; // in kg
  pieces: number;
  arrivalDate: string;
  releaseDate?: string;
  status: ShipmentStatus;
  rackId?: string;
  invoiceId?: number;
}

export interface Rack {
  id: string;
  rackLine: string;
  slot: string;
  status: RackStatus;
  capacity: number;
  currentLoad: number;
}

export interface ChargeSetting {
    id: number;
    name: string;
    rate: number;
    unit: string;
}

export interface Invoice {
    id: number;
    shipmentId: string;
    releaseDate: string;
    chargeDetails: Array<{
        name: string;
        rate: number;
        unit: string;
        quantity: number;
        total: number;
    }>;
    totalAmount: number;
    currency: string;
}
