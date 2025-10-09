import React, { useEffect, useState, FormEvent } from 'react';
import { useWMSData } from '../hooks/useWMSData';
import { User, UserRole, ChargeSetting } from '../types';

interface SettingsProps {
    showToast: (message: string, type: 'success' | 'error') => void;
}

const Settings: React.FC<SettingsProps> = ({ showToast }) => {
    const { users, fetchUsers, addUser, chargeSettings, fetchChargeSettings, addChargeSetting, deleteChargeSetting } = useWMSData();
    const [newUser, setNewUser] = useState({ username: '', password: '', role: UserRole.Worker });
    const [newCharge, setNewCharge] = useState({ name: '', rate: '', unit: 'flat fee' });

    useEffect(() => {
        fetchUsers();
        fetchChargeSettings();
    }, [fetchUsers, fetchChargeSettings]);

    const handleUserSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addUser(newUser);
            showToast('User created successfully.', 'success');
            setNewUser({ username: '', password: '', role: UserRole.Worker });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };
    
    const handleChargeSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addChargeSetting({ ...newCharge, rate: parseFloat(newCharge.rate) });
            showToast('Charge setting added.', 'success');
            setNewCharge({ name: '', rate: '', unit: 'flat fee' });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleChargeDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this charge?')) {
            try {
                await deleteChargeSetting(id);
                showToast('Charge setting deleted.', 'success');
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Admin Settings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User Management */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold mb-4">User Management</h3>
                    <form onSubmit={handleUserSubmit} className="space-y-4 mb-6">
                        <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" required />
                        <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" required />
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full p-2 border rounded dark:bg-gray-700">
                            {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add User</button>
                    </form>
                    <div className="space-y-2">
                        {users.map(user => (
                            <div key={user.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <span>{user.username}</span>
                                <span className="text-sm font-medium px-2 py-1 bg-blue-200 text-blue-800 rounded-full">{user.role}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Billing Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold mb-4">Billing Configuration (Currency: KWD)</h3>
                     <form onSubmit={handleChargeSubmit} className="space-y-4 mb-6">
                        <input type="text" placeholder="Charge Name" value={newCharge.name} onChange={e => setNewCharge({...newCharge, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" required />
                        <input type="number" step="0.001" placeholder="Rate (e.g., 10.000)" value={newCharge.rate} onChange={e => setNewCharge({...newCharge, rate: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700" required />
                        <select value={newCharge.unit} onChange={e => setNewCharge({...newCharge, unit: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700">
                            <option value="flat fee">Flat Fee</option>
                            <option value="per day">Per Day</option>
                            <option value="per hour">Per Hour</option>
                            <option value="per kg">Per KG</option>
                        </select>
                        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add Charge Type</button>
                    </form>
                    <div className="space-y-2">
                        {chargeSettings.map(charge => (
                             <div key={charge.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                <div>
                                    <span className="font-semibold">{charge.name}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{charge.rate.toFixed(3)} KWD / {charge.unit}</span>
                                </div>
                                <button onClick={() => handleChargeDelete(charge.id)} className="text-red-500 hover:text-red-700">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
