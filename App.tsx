
import React, { useState, useContext, createContext, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Shipments from './components/Shipments';
import Racks from './components/Racks';
import Reports from './components/Reports';
import Header from './components/Header';
import Settings from './components/Settings';
import Login from './components/Login';
import RegistrationPage from './components/RegistrationPage';
import { useWMSData } from './hooks/useWMSData';
import { User, AppSettings } from './types';

type View = 'dashboard' | 'shipments' | 'racks' | 'reports' | 'settings';

// --- Settings Context ---
interface SettingsContextType {
    settings: AppSettings | null;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings | null>>;
}
const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};

// --- Auth Context ---
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

export const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
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
            case 'reports': return <Reports {...wmsData} />;
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
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent border-solid rounded-full animate-spin"></div>
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

const PRIMARY_COLORS: Record<string, Record<string, string>> = {
    blue:   { '100': '#dbeafe', '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '900': '#1e3a8a' },
    green:  { '100': '#dcfce7', '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d', '900': '#14532d' },
    indigo: { '100': '#e0e7ff', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '900': '#312e81' },
    red:    { '100': '#fee2e2', '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c', '900': '#7f1d1d' },
    orange: { '100': '#ffedd5', '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c', '900': '#7c2d12' },
};

const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const { token } = useAuth();
    const { fetchAppSettings } = useWMSData(); 

    useEffect(() => {
        const loadSettings = async () => {
            if (token) {
                try {
                    const appSettings = await fetchAppSettings();
                    setSettings(appSettings);
                } catch (e) {
                    console.error("Could not load app settings", e);
                    setSettings({ companyName: 'Gemini WMS', theme: 'system', primaryColor: 'blue' });
                }
            }
        };
        loadSettings();
    }, [token, fetchAppSettings]);


    useEffect(() => {
        if (!settings) return;

        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        if (settings.theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(settings.theme);
        }

        const color = PRIMARY_COLORS[settings.primaryColor] || PRIMARY_COLORS.blue;
        const styleId = 'dynamic-app-styles';
        let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }
        
        styleTag.innerHTML = `
            :root {
                --color-primary-100: ${color['100']};
                --color-primary-400: ${color['400']};
                --color-primary-500: ${color['500']};
                --color-primary-600: ${color['600']};
                --color-primary-700: ${color['700']};
                --color-primary-900: ${color['900']};
            }
        `;
        
    }, [settings]);
    
    const value = useMemo(() => ({ settings, setSettings }), [settings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <SettingsProvider>
                <Main />
            </SettingsProvider>
        </AuthProvider>
    );
}

const Main: React.FC = () => {
    const { user } = useAuth();
    const { settings } = useSettings();
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('token')) {
            setIsRegistering(true);
        }
    }, []);
    
    if (isRegistering) {
        return <RegistrationPage />;
    }
    
    if (user && !settings) {
         return (
            <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent border-solid rounded-full animate-spin"></div>
                    <span className="text-xl font-semibold text-gray-700 dark:text-gray-200">Loading Customizations...</span>
                </div>
            </div>
        );
    }
    
    return user ? <WMSApp /> : <Login />;
}

export default App;
