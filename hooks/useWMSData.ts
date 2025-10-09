import { useState, useEffect, useCallback } from 'react';
import { Shipment, Rack, Invoice, ChargeSetting, User, AppSettings, CustomField, InventoryReportItem, TurnoverDataPoint } from '../types';
import { useAuth } from '../App';

const API_BASE_URL = '/api';

// This is a stand-alone fetch for public routes like registration
const publicApiFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json();
};

export const useWMSData = () => {
    const { token } = useAuth();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [racks, setRacks] = useState<Rack[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [chargeSettings, setChargeSettings] = useState<ChargeSetting[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (!token) throw new Error("Authentication token not found.");
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }
        return response.json();
    }, [token]);
    
    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            const [shipmentsData, racksData] = await Promise.all([
                apiFetch('/shipments'),
                apiFetch('/racks')
            ]);
            setShipments(shipmentsData);
            setRacks(racksData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [apiFetch, token]);

    useEffect(() => {
        if(token) {
            fetchData();
        } else {
            // Clear all data on logout
            setShipments([]);
            setRacks([]);
            setChargeSettings([]);
            setUsers([]);
            setCustomFields([]);
            setIsLoading(false);
        }
    }, [token, fetchData]);
    
    const addShipment = async (shipmentData: Omit<Shipment, 'id' | 'status' | 'arrivalDate' | 'invoiceId' | 'customFields'> & { customFields: Record<number, string | number> }): Promise<Shipment> => {
        const newShipment = await apiFetch('/shipments', {
            method: 'POST',
            body: JSON.stringify(shipmentData),
        });
        setShipments(prev => [newShipment, ...prev]);
        return newShipment;
    };
    
    const releaseShipment = async (shipmentId: string, charges: { chargeId: number, quantity: number }[]): Promise<void> => {
        await apiFetch(`/shipments/${shipmentId}/release`, {
            method: 'POST',
            body: JSON.stringify({ charges }),
        });
        await fetchData();
    };
    
    const assignShipmentToRack = async (shipmentId: string, rackId: string): Promise<void> => {
        await apiFetch(`/shipments/${shipmentId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ rackId }),
        });
        await fetchData();
    };

    const getInvoice = async (shipmentId: string): Promise<Invoice | null> => {
        return apiFetch(`/invoices/${shipmentId}`);
    };

    const fetchChargeSettings = useCallback(async (): Promise<void> => {
        try {
            const settings = await apiFetch('/settings/charges');
            setChargeSettings(settings);
        } catch (err: any) {
            console.error("Failed to fetch charge settings:", err);
            setError("Could not load charge settings.");
        }
    }, [apiFetch]);

    const updateChargeSettings = async (settings: ChargeSetting[]): Promise<void> => {
        await apiFetch('/settings/charges', {
            method: 'POST',
            body: JSON.stringify(settings),
        });
        await fetchChargeSettings();
    };
    
    const addRack = async (rackData: { rackLine: string; slot: string; capacity: number }): Promise<void> => {
        await apiFetch('/racks', {
            method: 'POST',
            body: JSON.stringify(rackData),
        });
        await fetchData();
    };
    
    // --- User Management ---
    const fetchUsers = useCallback(async (): Promise<void> => {
        try {
            const usersData = await apiFetch('/users');
            setUsers(usersData);
        } catch (err: any) {
             console.error("Failed to fetch users:", err);
             setError("Could not load user data.");
        }
    }, [apiFetch]);

    const inviteUser = async (email: string, role: string): Promise<{ message: string; registrationLink: string }> => {
        return apiFetch('/auth/invite', {
            method: 'POST',
            body: JSON.stringify({ email, role }),
        });
    };
    
    const approveUser = async (userId: string): Promise<void> => {
        await apiFetch(`/users/${userId}/approve`, { method: 'POST' });
        await fetchUsers(); // Refetch users to update status
    };

    const deleteUser = async (userId: string): Promise<void> => {
        await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        await fetchUsers();
    };
    
    // --- App Settings ---
    const fetchAppSettings = useCallback(async (): Promise<AppSettings> => {
        return apiFetch('/settings/app');
    }, [apiFetch]);

    const updateAppSettings = async (settings: Partial<AppSettings>): Promise<void> => {
        await apiFetch('/settings/app', {
            method: 'POST',
            body: JSON.stringify(settings),
        });
    };
    
    // --- Custom Fields ---
    const fetchCustomFields = useCallback(async (): Promise<void> => {
        try {
            const fields = await apiFetch('/settings/custom-fields');
            setCustomFields(fields);
        } catch (err: any) {
            console.error("Failed to fetch custom fields:", err);
            setError("Failed to fetch custom fields.");
        }
    }, [apiFetch]);

    const addCustomField = async (field: {label: string, type: string}): Promise<void> => {
        await apiFetch('/settings/custom-fields', {
            method: 'POST',
            body: JSON.stringify(field),
        });
        await fetchCustomFields();
    };
    
    // --- Reports ---
    const generateInventoryReport = async (): Promise<InventoryReportItem[]> => {
        return apiFetch('/reports/inventory');
    };

    const generateTurnoverReport = async (startDate: string, endDate: string): Promise<{inbound: TurnoverDataPoint[], outbound: TurnoverDataPoint[]}> => {
        return apiFetch(`/reports/turnover?startDate=${startDate}&endDate=${endDate}`);
    };


    return { 
        shipments, racks, users, chargeSettings, customFields,
        isLoading, error, 
        addShipment, releaseShipment, assignShipmentToRack, getInvoice,
        fetchChargeSettings, updateChargeSettings,
        addRack,
        fetchUsers, inviteUser, approveUser, deleteUser,
        fetchAppSettings, updateAppSettings,
        fetchCustomFields, addCustomField,
        generateInventoryReport, generateTurnoverReport,
        refetch: fetchData 
    };
};

export const AuthApi = {
    login: async (data: any) => {
        return publicApiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    register: async (data: any) => {
        return publicApiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

export const RegistrationData = {
    validateToken: async (token: string) => {
        return publicApiFetch(`/auth/validate-token/${token}`);
    },
    registerUser: async (data: any) => {
        return publicApiFetch('/auth/register-invited', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};