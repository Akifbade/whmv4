
import React from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types';

type View = 'dashboard' | 'shipments' | 'racks' | 'reports' | 'settings';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const icon = (path: string) => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path}></path>
  </svg>
);

const NavItem: React.FC<{
  view: View;
  label: string;
  currentView: View;
  setView: (view: View) => void;
  iconPath: string;
}> = ({ view, label, currentView, setView, iconPath }) => {
  const isActive = currentView === view;
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); setView(view); }}
      className={`flex items-center px-4 py-3 text-lg font-medium transition-colors duration-200 transform rounded-md ${
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon(iconPath)}
      <span className="mx-4">{label}</span>
    </a>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const { user } = useAuth();
  
  const hasAccess = (requiredRoles: UserRole[]) => {
      return user && requiredRoles.includes(user.role);
  }

  return (
    <aside className="flex flex-col w-64 h-screen px-4 py-8 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
      <div className="flex flex-col items-center -mx-2">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">WMS Menu</h2>
      </div>

      <div className="flex flex-col justify-between flex-1 mt-6">
        <nav>
            <NavItem view="dashboard" label="Dashboard" currentView={currentView} setView={setCurrentView} iconPath="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            {hasAccess([UserRole.Admin, UserRole.Supervisor, UserRole.Billing, UserRole.Worker]) && <NavItem view="shipments" label="Shipments" currentView={currentView} setView={setCurrentView} iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>}
            {hasAccess([UserRole.Admin, UserRole.Supervisor, UserRole.Worker]) && <NavItem view="racks" label="Racks" currentView={currentView} setView={setCurrentView} iconPath="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>}
            {hasAccess([UserRole.Admin, UserRole.Supervisor]) && <NavItem view="reports" label="Reports" currentView={currentView} setView={setCurrentView} iconPath="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            {hasAccess([UserRole.Admin]) && <NavItem view="settings" label="Settings" currentView={currentView} setView={setCurrentView} iconPath="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
