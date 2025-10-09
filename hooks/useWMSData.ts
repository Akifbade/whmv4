
import { useState, useEffect, useCallback } from 'react';
import { Shipment, Rack, Invoice, ChargeSetting, User } from '../types';
import { useAuth } from '../App';

const API_BASE_URL = 'http://localhost:3001/api';

export const useWMSData = () => {
    const { token } = useAuth();
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [racks, setRacks] = useState<Rack[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [chargeSettings, setChargeSettings] = useState<ChargeSetting[]>([]);
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
    }, [apiFetch]);

    useEffect(() => {
        if(token) {
            fetchData();
        } else {
            setShipments([]);
            setRacks([]);
            setChargeSettings([]);
            setUsers([]);
            setIsLoading(false);
        }
    }, [token, fetchData]);

    // ... Shipment, Rack, Invoice, ChargeSetting functions ...

    const addShipment = async (shipmentData: Omit<Shipment, 'id' | 'status' | 'arrivalDate' | 'invoiceId'>): Promise<Shipment> => {
        const newShipment = await apiFetch('/shipments', {
            method: 'POST',
            body: JSON.stringify(shipmentData),
        });
        setShipments(prev => [...prev, newShipment]);
        return newShipment;
    };
    
    const releaseShipment = async (shipmentId: string, chargeOverrides: any): Promise<void> => {
        await apiFetch(`/shipments/${shipmentId}/release`, {
            method: 'POST',
            body: JSON.stringify({ chargeOverrides }),
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

    const approveUser = async (userId: string): Promise<void> => {
        await apiFetch(`/users/${userId}/approve`, { method: 'PATCH' });
        await fetchUsers();
    };

    const deleteUser = async (userId: string): Promise<void> => {
        await apiFetch(`/users/${userId}`, { method: 'DELETE' });
        await fetchUsers();
    };


    return { 
        shipments, 
        racks, 
        users,
        isLoading, 
        error, 
        addShipment,
        releaseShipment,
        assignShipmentToRack,
        getInvoice,
        chargeSettings,
        fetchChargeSettings,
        updateChargeSettings,
        addRack,
        fetchUsers,
        approveUser,
        deleteUser,
        refetch: fetchData 
    };
};