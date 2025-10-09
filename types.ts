
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
  email: string;
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
  invoiceId?: number;
  commodity?: string;
  dimensions?: string;
  notes?: string;
  expectedDate?: string;
  customFields: Record<string, string | number>;
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
    id: number;
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
    id: number;
    shipmentId: string;
    releaseDate: string;
    chargeDetails: InvoiceChargeDetail[];
    totalAmount: number;
    currency: string;
}

export interface AppSettings {
    companyName: string;
    theme: 'light' | 'dark' | 'system';
    primaryColor: 'blue' | 'green' | 'indigo' | 'red' | 'orange';
}

export interface CustomField {
    id: number;
    label: string;
    type: 'Text' | 'Number' | 'Date';
}

export interface InventoryReportItem {
    id: string;
    shipper: string;
    consignee: string;
    rackId: string;
    arrivalDate: string;
    daysInStorage: number;
}

export interface TurnoverDataPoint {
    date: string;
    count: number;
}
