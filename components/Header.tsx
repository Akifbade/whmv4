
import React from 'react';
import { useAuth, useSettings } from '../App';

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    
    return (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
                <img src="http://qgocargo.com/logo.png" alt="Company Logo" className="h-10" />
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    {settings?.companyName || 'WMS'}
                </h1>
            </div>
            <div className="flex items-center space-x-4">
                {user && (
                    <div className="text-right">
                        <p className="font-semibold text-gray-800 dark:text-white">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                    </div>
                )}
                <button 
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    Logout
                </button>
            </div>
        </header>
    );
};

export default Header;
