
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Shipments from './components/Shipments';
import Racks from './components/Racks';
import Header from './components/Header';
import { useWMSData } from './hooks/useWMSData';
import { UserRole } from './types';

type View = 'dashboard' | 'shipments' | 'racks';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.Admin);
  
  const wmsData = useWMSData();
  const { isLoading, error, shipments } = wmsData;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard shipments={wmsData.shipments} racks={wmsData.racks} />;
      case 'shipments':
        return <Shipments {...wmsData} currentUserRole={currentUserRole} />;
      case 'racks':
        return <Racks {...wmsData} currentUserRole={currentUserRole}/>;
      default:
        return <Dashboard shipments={wmsData.shipments} racks={wmsData.racks} />;
    }
  };

  const renderError = () => {
    if (error?.startsWith('MIXED_CONTENT_ERROR:')) {
        const message = error.replace('MIXED_CONTENT_ERROR: ', '');
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl">
                 <svg className="mx-auto h-12 w-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                 </svg>
                 <h2 className="mt-4 text-2xl font-bold text-orange-500">Browser Security Block</h2>
                 <div className="mt-4 text-left text-gray-700 dark:text-gray-300 space-y-4">
                    <p>Your browser has blocked the app from connecting to the API server. This is a security feature, not a bug in the code.</p>
                    <div>
                        <h3 className="font-bold">The Problem: Mixed Content</h3>
                        <p>{message}</p>
                    </div>
                     <div>
                        <h3 className="font-bold">How to Fix</h3>
                        <p className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md">The backend server at <strong>http://185.120.19.19:3001</strong> must be configured to serve traffic over a secure <strong>HTTPS</strong> connection with a valid SSL certificate.</p>
                    </div>
                 </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
                >
                    Retry Connection
                </button>
            </div>
        );
    } else if (error?.startsWith('LOCAL_CONNECTION_FAILED:')) {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl">
                 <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L5.636 18.364m0-12.728L18.364 18.364" />
                 </svg>
                 <h2 className="mt-4 text-2xl font-bold text-red-500">Cannot Connect to Local Server</h2>
                 <div className="mt-4 text-left text-gray-700 dark:text-gray-300 space-y-4">
                    <p>The application could not reach the backend API server. This usually means the server is not running or is misconfigured. Please check the following:</p>
                    <ul className="list-disc list-inside space-y-2 bg-gray-100 dark:bg-gray-900 p-4 rounded-md">
                        <li>
                            <strong>Is the server running?</strong> A terminal window should be open with the message:
                            <code className="block bg-gray-200 dark:bg-gray-700 p-1 rounded text-sm mt-1">Server running on http://localhost:3001</code>
                        </li>
                        <li>
                            <strong>Is your database running?</strong> The backend server needs to connect to your MySQL database. Ensure it is active.
                        </li>
                        <li>
                            <strong>Is the <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-xs">.env</code> file correct?</strong> This file in your project folder must contain the correct database credentials.
                        </li>
                    </ul>
                 </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    // Generic error
    return (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-red-500">Connection Error</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
          >
            Retry
          </button>
        </div>
    );
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        {renderError()}
      </div>
    );
  }

  // Show a loading screen only on the initial data fetch
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
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUserRole={currentUserRole} setCurrentUserRole={setCurrentUserRole} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;
