import { useState, useCallback, useEffect } from 'react';
import { Shipment, Rack } from '../types';

// NOTE: Update this URL to point to your backend server.
// For local development, this should match the port your server.js is running on.
const API_BASE_URL = 'http://localhost:3001/api';

export const useWMSData = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [shipmentsRes, racksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/shipments`),
        fetch(`${API_BASE_URL}/racks`),
      ]);
      
      if (!shipmentsRes.ok || !racksRes.ok) {
          throw new Error('Failed to fetch data from server. The server responded with an error status.');
      }

      const shipmentsData = await shipmentsRes.json();
      const racksData = await racksRes.json();
      
      setShipments(shipmentsData);
      setRacks(racksData);
    } catch (error: any) {
      console.error("Failed to fetch WMS data:", error);
      let message = 'An unexpected error occurred while fetching data.';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
          if (window.location.protocol === 'https:') {
              message = 'MIXED_CONTENT_ERROR: Your app is running on a secure (https) connection, which prevents it from fetching data from an insecure (http) server. This is a browser security feature called "Mixed Content blocking".';
          } else {
              message = 'LOCAL_CONNECTION_FAILED: Could not connect to the backend server. Please check your local setup.';
          }
      } else if (error.message) {
          message = error.message;
      }
      setError(message);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addShipment = useCallback(async (newShipment: Omit<Shipment, 'id' | 'status' | 'arrivalDate'>): Promise<Shipment | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shipments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newShipment),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add shipment.');
        }
        const createdShipment = await response.json();
        await fetchData(); // Refetch all data to ensure consistency
        return createdShipment;
    } catch (error) {
        console.error("Error adding shipment:", error);
        alert(`Error: ${error.message}`);
        return null;
    }
  }, [fetchData]);

  const addRack = useCallback(async (rackData: { rackLine: string; slot: string; capacity: number }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/racks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rackData),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to add rack.');
        }
        await fetchData(); // Refetch all data
    } catch (error) {
        console.error("Error adding rack:", error);
        alert(`Error: ${error.message}`);
    }
  }, [fetchData]);

  const assignShipmentToRack = useCallback(async (shipmentId: string, rackId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/shipments/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId, rackId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to assign shipment to rack.');
        }
        await fetchData(); // Refetch all data
    } catch (error) {
        console.error("Error assigning shipment:", error);
        alert(`Error: ${error.message}`);
    }
  }, [fetchData]);

  const releaseShipment = useCallback(async (shipmentId: string) => {
    try {
        const response = await fetch(`${API_BASE_URL}/shipments/release/${shipmentId}`, {
            method: 'PUT',
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to release shipment.');
        }
        await fetchData(); // Refetch all data
    } catch (error) {
        console.error("Error releasing shipment:", error);
        alert(`Error: ${error.message}`);
    }
  }, [fetchData]);

  return { shipments, racks, addShipment, addRack, assignShipmentToRack, releaseShipment, isLoading, error };
};