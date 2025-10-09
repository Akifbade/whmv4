
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
  charges?: {
    storage: number;
    handling: number;
    total: number;
  }
}

export interface Rack {
  id: string;
  rackLine: string;
  slot: string;
  status: RackStatus;
  capacity: number;
  currentLoad: number;
}
