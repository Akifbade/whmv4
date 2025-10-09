
import React from 'react';
import { UserRole } from '../types';

interface HeaderProps {
    currentUserRole: UserRole;
    setCurrentUserRole: (role: UserRole) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUserRole, setCurrentUserRole }) => {
    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentUserRole(e.target.value as UserRole);
    }
    
    return (
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Gemini WMS</h1>
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">Role:</span>
                <select 
                    value={currentUserRole} 
                    onChange={handleRoleChange}
                    className="bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>
        </header>
    );
};

export default Header;
