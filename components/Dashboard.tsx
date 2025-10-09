

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// FIX: Corrected import path for types.
import { Shipment, Rack, ShipmentStatus } from '../types';

interface DashboardProps {
  shipments: Shipment[];
  racks: Rack[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex items-center space-x-4">
        <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-500">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ shipments, racks }) => {
    const totalShipments = shipments.length;
    const activeShipments = shipments.filter(s => s.status === ShipmentStatus.Stored).length;

    const totalCapacity = racks.reduce((sum, rack) => sum + rack.capacity, 0);
    const totalLoad = racks.reduce((sum, rack) => sum + rack.currentLoad, 0);
    const availableSlots = totalCapacity - totalLoad;
    const utilization = totalCapacity > 0 ? ((totalLoad / totalCapacity) * 100).toFixed(1) + '%' : '0%';
    
    const processChartData = () => {
        const data: { [key: string]: { intake: number; release: number } } = {};
        
        shipments.forEach(shipment => {
            const arrivalDate = new Date(shipment.arrivalDate).toLocaleDateString();
            if (!data[arrivalDate]) data[arrivalDate] = { intake: 0, release: 0 };
            data[arrivalDate].intake++;

            if(shipment.releaseDate) {
                const releaseDate = new Date(shipment.releaseDate).toLocaleDateString();
                if (!data[releaseDate]) data[releaseDate] = { intake: 0, release: 0 };
                data[releaseDate].release++;
            }
        });

        return Object.entries(data).map(([date, values]) => ({ date, ...values })).slice(-7); // Last 7 days
    }
    
    const chartData = processChartData();

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Shipments" value={totalShipments} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>} />
        <StatCard title="Active (Stored)" value={activeShipments} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>} />
        <StatCard title="Available Rack Slots" value={availableSlots} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>} />
        <StatCard title="Warehouse Utilization" value={utilization} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>} />
      </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Daily Intake vs. Release</h3>
             <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }}/>
                <Legend />
                <Bar dataKey="intake" fill="var(--color-primary-500)" />
                <Bar dataKey="release" fill="#84cc16" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default Dashboard;
