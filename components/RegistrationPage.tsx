
import React, { useState, useEffect, FormEvent } from 'react';
import { RegistrationData } from '../hooks/useWMSData';

const RegistrationPage: React.FC = () => {
    const [token, setToken] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<{ email: string; role: string } | null>(null);
    const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
            setToken(urlToken);
            RegistrationData.validateToken(urlToken)
                .then(data => setInvitation(data))
                .catch(err => setError(err.message || "Invalid or expired invitation link."))
                .finally(() => setIsLoading(false));
        } else {
            setError("No invitation token provided.");
            setIsLoading(false);
        }
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await RegistrationData.registerUser({ ...formData, token });
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (isSuccess) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800 text-center">
                     <h1 className="text-2xl font-bold text-green-500">Registration Successful!</h1>
                     <p>You can now log in with your new credentials.</p>
                     <button onClick={() => window.location.href = '/'} className="w-full px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">Go to Login</button>
                </div>
            </div>
        );
    }
    
    if (error || !invitation) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800 text-center">
                     <h1 className="text-2xl font-bold text-red-500">Registration Error</h1>
                     <p>{error || "Could not validate invitation."}</p>
                     <button onClick={() => window.location.href = '/'} className="w-full px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">Return to Homepage</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h1 className="text-2xl font-bold text-center">Complete Your Registration</h1>
                <p className="text-center">Welcome! Your email is <strong>{invitation.email}</strong> and your role will be <strong>{invitation.role}</strong>.</p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <input name="username" type="text" placeholder="Choose a Username" required value={formData.username} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    <input name="password" type="password" placeholder="Create Password" required value={formData.password} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    <input name="confirmPassword" type="password" placeholder="Confirm Password" required value={formData.confirmPassword} onChange={handleInputChange} className="block w-full px-3 py-2 border rounded-md dark:bg-gray-700" />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50">
                        {isLoading ? 'Registering...' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;
