import React, { useState, FormEvent } from 'react';
import { useAuth, Toast } from '../App';
import { User } from '../types';
import { AuthApi } from '../hooks/useWMSData';

const RegistrationModal: React.FC<{ onClose: () => void; showToast: (message: string, type: 'success' | 'error') => void; }> = ({ onClose, showToast }) => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const result = await AuthApi.register(formData);
            showToast(result.message, 'success');
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-6">Create New Account</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input name="username" type="text" placeholder="Username" required value={formData.username} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    <input name="email" type="email" placeholder="Email Address" required value={formData.email} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    <input name="password" type="password" placeholder="Password" required value={formData.password} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    <input name="confirmPassword" type="password" placeholder="Confirm Password" required value={formData.confirmPassword} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="pt-4 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                            {isLoading ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const { login } = useAuth();

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const data = await AuthApi.login({ username, password });
            const { user, token } = data as { user: User, token: string };
            login(user, token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {showRegisterModal && <RegistrationModal onClose={() => setShowRegisterModal(false)} showToast={showToast} />}
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <div className="flex justify-center">
                    <img src="http://qgocargo.com/logo.png" alt="Company Logo" className="h-16" />
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
                    WMS Login
                </h1>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input id="username" name="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="block w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoading} className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50">
                            {isLoading ? 'Logging in...' : 'Log In'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowRegisterModal(true); }} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                        Create an Account
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;