import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import ManageUsers from './ManageUsers';
import ManageAdminListings from './ManageAdminListings';
import ManageCategories from './ManageCategories';
import ManageFinance from './ManageFinance';
import ManagePromotions from './ManagePromotions'; 
import ManageReferrals from './ManageReferrals';
import ManageStorage from './ManageStorage';
import ManageBanners from './ManageBanners'; 
import ManageHelpCenter from './ManageHelpCenter';
import ManageSettings from './ManageSettings'; // New Import
import { User, Listing } from '../../types';

type AdminTab = 'dashboard' | 'users' | 'listings' | 'categories' | 'finance' | 'promotions' | 'referrals' | 'storage' | 'banners' | 'help' | 'settings';

interface AdminPanelProps {
    users: User[];
    listings: Listing[];
    onUpdateUserVerification: (userId: string, isVerified: boolean) => void;
    onDeleteListing: (listingId: string) => void;
    onImpersonate: (user: User) => void;
    onNavigate: (view: string, payload?: any) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, listings, onUpdateUserVerification, onDeleteListing, onImpersonate, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard users={users} listings={listings} />;
      case 'users': return <ManageUsers users={users} listings={listings} onUpdateUserVerification={onUpdateUserVerification} onImpersonate={onImpersonate} />;
      case 'listings': return <ManageAdminListings listings={listings} onDeleteListing={onDeleteListing} onNavigate={onNavigate} />;
      case 'categories': return <ManageCategories />;
      case 'finance': return <ManageFinance users={users} />;
      case 'promotions': return <ManagePromotions users={users} />;
      case 'referrals': return <ManageReferrals users={users} />;
      case 'storage': return <ManageStorage listings={listings} />;
      case 'banners': return <ManageBanners listings={listings} />;
      case 'help': return <ManageHelpCenter />;
      case 'settings': return <ManageSettings />; // New Router Case
      default: return <AdminDashboard users={users} listings={listings} />;
    }
  };

  const NavItem = ({ tab, label, icon }: { tab: AdminTab; label: string; icon: React.ReactElement }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left ${
        activeTab === tab 
          ? 'bg-primary text-white shadow' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 mr-3" })}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-1/4 lg:w-1/5">
        <div className="p-4 bg-white dark:bg-dark-surface rounded-xl shadow-lg h-full">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 px-2">Admin Menu</h2>
          <nav className="flex flex-col space-y-2">
            <NavItem tab="dashboard" label="Dashboard" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2-2v-2z" /></svg>} />
            <NavItem tab="users" label="Manage Users" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.284-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.284.24-1.857m10 0A5 5 0 0013 11V7a4 4 0 00-8 0v4a5 5 0 00-4.24 5.143" /></svg>} />
            <NavItem tab="listings" label="Ads Monitor" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} />
            <NavItem tab="categories" label="Market Meta" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
            <NavItem tab="banners" label="Banners" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>} />
            <NavItem tab="help" label="Help Center" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <div className="my-2 border-t border-gray-100 dark:border-gray-700"></div>
            <NavItem tab="promotions" label="Campaigns" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} />
            <NavItem tab="referrals" label="Referrals" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
            <NavItem tab="finance" label="Finance" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <NavItem tab="settings" label="App Config" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            <NavItem tab="storage" label="Storage" icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>} />
          </nav>
        </div>
      </aside>

      <main className="w-full md:w-3/4 lg:w-4/5">
        <div className="p-6 bg-white dark:bg-dark-surface rounded-xl shadow-lg h-full">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
