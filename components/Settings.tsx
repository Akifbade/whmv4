
import React, { useState, useEffect, FormEvent } from 'react';
import { useWMSData } from '../hooks/useWMSData';
import { ChargeSetting, User, UserStatus } from '../types';

interface SettingsProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const ChargeSettings: React.FC<SettingsProps> = ({ showToast }) => {
    const { chargeSettings, fetchChargeSettings, updateChargeSettings } = useWMSData();
    const [settings, setSettings] = useState<ChargeSetting[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchChargeSettings();
    }, [fetchChargeSettings]);
    
    useEffect(() => {
        if (chargeSettings) setSettings(chargeSettings);
    }, [chargeSettings]);

    const handleInputChange = (id: number, field: 'rate', value: string) => {
        setSettings(settings.map(s => s.id === id ? { ...s, [field]: parseFloat(value) || 0 } : s));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateChargeSettings(settings);
            showToast('Settings updated successfully!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update settings.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold mb-4">Charge Settings</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Configure rates for warehouse services.</p>
            {settings.length === 0 ? <p>Loading settings...</p> : (
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {settings.map(setting => (
                            <div key={setting.id} className="grid grid-cols-3 gap-4 items-center">
                                <label htmlFor={`rate-${setting.id}`} className="font-medium">{setting.name} ({setting.unit})</label>
                                <input type="number" id={`rate-${setting.id}`} step="0.001" value={setting.rate}
                                    onChange={(e) => handleInputChange(setting.id, 'rate', e.target.value)}
                                    className="col-span-2 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 focus:outline-none focus:ring-blue-500"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button type="submit" disabled={isLoading} className="px-6 py-2 leading-5 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

const UserManagement: React.FC<SettingsProps> = ({ showToast }) => {
    const { users, fetchUsers, approveUser, deleteUser } = useWMSData();

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleApprove = async (userId: string) => {
        try {
            await approveUser(userId);
            showToast('User approved successfully.', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };
    
    const handleDecline = async (userId: string) => {
        if (window.confirm('Are you sure you want to decline and delete this user?')) {
            try {
                await deleteUser(userId);
                showToast('User declined and removed.', 'success');
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
    };

    const pendingUsers = users.filter(u => u.status === UserStatus.Pending);
    const activeUsers = users.filter(u => u.status === UserStatus.Active);
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold mb-4">User Management</h3>
            <div className="mb-8">
                <h4 className="text-lg font-medium mb-2">Pending Approvals</h4>
                {pendingUsers.length > 0 ? (
                    <ul className="divide-y dark:divide-gray-700">
                        {pendingUsers.map(user => (
                            <li key={user.id} className="py-2 flex justify-between items-center">
                                <span>{user.username} ({user.role})</span>
                                <div className="space-x-2">
                                    <button onClick={() => handleApprove(user.id)} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">Approve</button>
                                    <button onClick={() => handleDecline(user.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Decline</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500">No users pending approval.</p>}
            </div>
            <div>
                <h4 className="text-lg font-medium mb-2">Active Users</h4>
                 {activeUsers.length > 0 ? (
                    <ul className="divide-y dark:divide-gray-700">
                        {activeUsers.map(user => (
                            <li key={user.id} className="py-2 flex justify-between items-center">
                                <span>{user.username} ({user.role})</span>
                                <button onClick={() => handleDecline(user.id)} className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">Remove</button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500">No active users.</p>}
            </div>
        </div>
    );
};


const Settings: React.FC<SettingsProps> = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState('users');
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="flex border-b mb-6">
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>User Management</button>
                <button onClick={() => setActiveTab('charges')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'charges' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>Charge Settings</button>
            </div>

            {activeTab === 'users' && <UserManagement showToast={showToast} />}
            {activeTab === 'charges' && <ChargeSettings showToast={showToast} />}
        </div>
    );
};

export default Settings;