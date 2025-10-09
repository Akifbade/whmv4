import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../App';
import { Shipment, Rack, User, ChargeSetting, Invoice } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

export const useWMSData = () => {
  const { token, logout } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [chargeSettings, setChargeSettings] = useState<ChargeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [shipmentsRes, racksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/shipments`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/racks`, { headers: getAuthHeaders() }),
      ]);
      
      if(shipmentsRes.status === 401 || racksRes.status === 401) {
          logout(); // Token is invalid, force logout
          return;
      }
      if (!shipmentsRes.ok || !racksRes.ok) throw new Error('Failed to fetch data from server.');

      setShipments(await shipmentsRes.json());
      setRacks(await racksRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
        setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generic request handler
  const makeRequest = async (endpoint: string, options: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (response.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
    }
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Request to ${endpoint} failed.`);
    }
    return response.status === 204 ? null : response.json();
  };

  // SHIPMENTS
  const addShipment = useCallback(async (newShipment: Omit<Shipment, 'id' | 'status' | 'arrivalDate'>): Promise<Shipment> => {
    const createdShipment = await makeRequest('/shipments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newShipment),
    });
    await fetchData();
    return createdShipment;
  }, [fetchData, token]);
  
  const assignShipmentToRack = useCallback(async (shipmentId: string, rackId: string) => {
    await makeRequest('/shipments/assign', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ shipmentId, rackId }),
    });
    await fetchData();
  }, [fetchData, token]);
  
  const releaseShipment = useCallback(async (shipmentId: string, chargeOverrides: any) => {
    const result = await makeRequest(`/shipments/release/${shipmentId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ chargeOverrides }),
    });
    await fetchData();
    return result;
  }, [fetchData, token]);

  const getInvoice = useCallback(async (shipmentId: string): Promise<Invoice | null> => {
    try {
        return await makeRequest(`/invoices/${shipmentId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
    } catch (e) {
        return null; // Return null if not found
    }
  }, [token]);

  // RACKS
  const addRack = useCallback(async (rackData: { rackLine: string; slot: string; capacity: number }) => {
    await makeRequest('/racks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(rackData),
    });
    await fetchData();
  }, [fetchData, token]);

  // USERS (Admin)
  const fetchUsers = useCallback(async () => {
    const usersData = await makeRequest('/users', { headers: getAuthHeaders() });
    setUsers(usersData);
  }, [token]);
  const addUser = useCallback(async (userData: any) => {
    await makeRequest('/users', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(userData) });
    await fetchUsers();
  }, [fetchUsers, token]);

  // SETTINGS (Admin)
  const fetchChargeSettings = useCallback(async () => {
    const settingsData = await makeRequest('/settings/charges', { headers: getAuthHeaders() });
    setChargeSettings(settingsData);
  }, [token]);
  const addChargeSetting = useCallback(async (settingData: any) => {
    await makeRequest('/settings/charges', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(settingData) });
    await fetchChargeSettings();
  }, [fetchChargeSettings, token]);
  const deleteChargeSetting = useCallback(async (id: number) => {
    await makeRequest(`/settings/charges/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    await fetchChargeSettings();
  }, [fetchChargeSettings, token]);


  return { 
      shipments, racks, users, chargeSettings, isLoading, error, 
      fetchData, addShipment, addRack, assignShipmentToRack, releaseShipment, getInvoice,
      fetchUsers, addUser,
      fetchChargeSettings, addChargeSetting, deleteChargeSetting
  };
};
