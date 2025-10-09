
import React, { useState, useEffect, FormEvent } from 'react';
import { useWMSData } from '../hooks/useWMSData';
import { ChargeSetting, User, UserRole, AppSettings, CustomField } from '../types';
import { useSettings } from '../App';

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
                                    className="col-span-2 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 focus:outline-none focus:ring-primary-500"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button type="submit" disabled={isLoading} className="px-6 py-2 leading-5 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

const UserManagement: React.FC<SettingsProps> = ({ showToast }) => {
    const { users, fetchUsers, deleteUser, inviteUser } = useWMSData();
    const [showInviteModal, setShowInviteModal] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleDelete = async (userId: string) => {
        if (window.confirm('Are you sure you want to remove this user permanently?')) {
            try {
                await deleteUser(userId);
                showToast('User removed.', 'success');
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} showToast={showToast} inviteUser={inviteUser} />}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">User Management</h3>
                <button onClick={() => setShowInviteModal(true)} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Invite User</button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-left">Username</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left">Role</th>
                            <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                     <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="py-2">
                                <td className="px-4 py-2">{user.username}</td>
                                <td className="px-4 py-2">{user.email}</td>
                                <td className="px-4 py-2">{user.role}</td>
                                <td className="px-4 py-2">
                                    <button onClick={() => handleDelete(user.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600">Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InviteUserModal: React.FC<{
    onClose: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    inviteUser: (email: string, role: string) => Promise<{ message: string; registrationLink: string }>;
}> = ({ onClose, showToast, inviteUser }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.Worker);
    const [generatedLink, setGeneratedLink] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await inviteUser(email, role);
            setGeneratedLink(result.registrationLink);
            showToast('Invitation link generated!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-6">Invite New User</h3>
                {!generatedLink ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="User's Email" required className="block w-full px-4 py-2 border rounded-md dark:bg-gray-700"/>
                        <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="block w-full px-4 py-2 border rounded-md dark:bg-gray-700">
                            {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                         <div className="mt-8 flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                            <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">{isLoading ? 'Generating...' : 'Generate Invite Link'}</button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <p className="mb-2">Please copy this link and send it to the new user. It is valid for 7 days.</p>
                        <input type="text" readOnly value={generatedLink} className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700" />
                        <div className="mt-4 flex justify-end">
                             <button onClick={onClose} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Done</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const CustomizationSettings: React.FC<SettingsProps> = ({ showToast }) => {
    const { settings, setSettings } = useSettings();
    const { updateAppSettings } = useWMSData();
    const [localSettings, setLocalSettings] = useState<AppSettings | null>(settings);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!localSettings) return <p>Loading settings...</p>;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => prev ? { ...prev, [name]: value } : null);
    };
    
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setLocalSettings(prev => prev ? { ...prev, [name]: value as AppSettings['theme'] } : null);
    }
    
    const handleColorChange = (color: AppSettings['primaryColor']) => {
        setLocalSettings(prev => prev ? { ...prev, primaryColor: color } : null);
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!localSettings) return;
        setIsLoading(true);
        try {
            await updateAppSettings(localSettings);
            setSettings(localSettings);
            showToast('Customization settings updated!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update settings.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const colorOptions: { name: AppSettings['primaryColor']; bg: string }[] = [
        { name: 'blue', bg: 'bg-blue-500' }, { name: 'green', bg: 'bg-green-500' },
        { name: 'indigo', bg: 'bg-indigo-500' }, { name: 'red', bg: 'bg-red-500' },
        { name: 'orange', bg: 'bg-orange-500' },
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold mb-6">Application Customization</h3>
            <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                    <input type="text" id="companyName" name="companyName" value={localSettings.companyName}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700 focus:outline-none"
                    />
                </div>
                <div>
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                    <select id="theme" name="theme" value={localSettings.theme} onChange={handleSelectChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700 focus:outline-none">
                        <option value="system">System Default</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
                    <div className="flex space-x-3">
                        {colorOptions.map(color => (
                            <button key={color.name} type="button" onClick={() => handleColorChange(color.name)}
                                className={`w-8 h-8 rounded-full ${color.bg} ${localSettings.primaryColor === color.name ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
                                aria-label={`Select ${color.name} color`}
                            ></button>
                        ))}
                    </div>
                </div>
                <div className="mt-8 flex justify-end">
                    <button type="submit" disabled={isLoading} className="px-6 py-2 leading-5 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50">
                        {isLoading ? 'Saving...' : 'Save Customizations'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const ShipmentFieldsSettings: React.FC<SettingsProps> = ({ showToast }) => {
    const { customFields, fetchCustomFields, addCustomField } = useWMSData();
    const [newField, setNewField] = useState({ label: '', type: 'Text' });

    useEffect(() => { fetchCustomFields() }, [fetchCustomFields]);

    const handleAddField = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addCustomField(newField);
            showToast('Custom field added!', 'success');
            setNewField({ label: '', type: 'Text' });
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold mb-4">Custom Shipment Fields</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Add extra fields to the shipment creation form.</p>
            <div className="mb-8">
                <h4 className="font-semibold mb-2">Existing Fields:</h4>
                <ul className="list-disc list-inside">
                    {customFields.map(f => <li key={f.id}>{f.label} ({f.type})</li>)}
                </ul>
            </div>
            <form onSubmit={handleAddField} className="flex items-end gap-4">
                <div className="flex-grow">
                    <label>Field Label</label>
                    <input type="text" value={newField.label} onChange={e => setNewField({...newField, label: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700" required/>
                </div>
                <div>
                    <label>Field Type</label>
                    <select value={newField.type} onChange={e => setNewField({...newField, type: e.target.value})} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700">
                        <option>Text</option><option>Number</option><option>Date</option>
                    </select>
                </div>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Add Field</button>
            </form>
        </div>
    );
};

const Settings: React.FC<SettingsProps> = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState('users');
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Settings</h2>
            <div className="flex border-b mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('users')} className={`flex-shrink-0 px-4 py-2 text-lg font-medium ${activeTab === 'users' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>User Management</button>
                <button onClick={() => setActiveTab('charges')} className={`flex-shrink-0 px-4 py-2 text-lg font-medium ${activeTab === 'charges' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Charge Settings</button>
                <button onClick={() => setActiveTab('customization')} className={`flex-shrink-0 px-4 py-2 text-lg font-medium ${activeTab === 'customization' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Customization</button>
                 <button onClick={() => setActiveTab('fields')} className={`flex-shrink-0 px-4 py-2 text-lg font-medium ${activeTab === 'fields' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Shipment Fields</button>
            </div>

            {activeTab === 'users' && <UserManagement showToast={showToast} />}
            {activeTab === 'charges' && <ChargeSettings showToast={showToast} />}
            {activeTab === 'customization' && <CustomizationSettings showToast={showToast} />}
            {activeTab === 'fields' && <ShipmentFieldsSettings showToast={showToast} />}
        </div>
    );
};

export default Settings;
