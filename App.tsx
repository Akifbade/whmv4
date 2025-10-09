
import React, { useState, useContext, createContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Shipments from './components/Shipments';
import Racks from './components/Racks';
import Header from './components/Header';
// FIX: Corrected import path for Settings component.
import Settings from './components/Settings';
// FIX: Corrected import path for Login component.
import Login from './components/Login';
// FIX: Corrected import path for useWMSData hook.
import { useWMSData } from './hooks/useWMSData';
// FIX: Corrected import path for types.
import { User } from './types';

type View = 'dashboard' | 'shipments' | 'racks' | 'settings';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white ${bgColor} flex items-center animate-fade-in-down`}>
            <span className="flex-grow">{message}</span>
            <button onClick={onClose} className="ml-4 font-bold text-xl">&times;</button>
        </div>
    );
};

const WMSApp: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const { user } = useAuth();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };
    
    const wmsData = useWMSData();
    const { isLoading, error, shipments } = wmsData;

    const renderView = () => {
        switch (currentView) {
            case 'dashboard': return <Dashboard {...wmsData} />;
            case 'shipments': return <Shipments {...wmsData} showToast={showToast} />;
            case 'racks': return <Racks {...wmsData} showToast={showToast} />;
            case 'settings': return <Settings showToast={showToast} />;
            default: return <Dashboard {...wmsData} />;
        }
    };
    
    if (error) {
        return (
          <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
             <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg">
                <h2 className="mt-4 text-2xl font-bold text-red-500">Connection Error</h2>
                <p className="mt-2 text-gray-700 dark:text-gray-300">{error}</p>
             </div>
          </div>
        );
    }
    if (isLoading && shipments.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
                    <span className="text-xl font-semibold text-gray-700 dark:text-gray-200">Loading WMS Data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for existing session
        const storedToken = localStorage.getItem('wms_token');
        const storedUser = localStorage.getItem('wms_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (userData: User, userToken: string) => {
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('wms_user', JSON.stringify(userData));
        localStorage.setItem('wms_token', userToken);
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('wms_user');
        localStorage.removeItem('wms_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <Main />
        </AuthProvider>
    );
}

const Main: React.FC = () => {
    const { user } = useAuth();
    return user ? <WMSApp /> : <Login />;
}

export default App;
