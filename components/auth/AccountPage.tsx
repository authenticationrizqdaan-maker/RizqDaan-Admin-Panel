
import React from 'react';
import { User, Listing } from '../../types';

interface AccountPageProps {
  user: User;
  listings: Listing[];
  onLogout: () => void;
  onNavigate: (view: 'my-ads' | 'add-listing' | 'vendor-analytics' | 'favorites' | 'saved-searches' | 'edit-profile' | 'settings' | 'promote-business' | 'add-balance' | 'referrals' | 'wallet-history' | 'notifications') => void;
}

const AccountPage: React.FC<AccountPageProps> = ({ user, listings, onLogout, onNavigate }) => {

  // Calculate Real Stats from Listings
  const myListings = listings.filter(l => l.vendorId === user.id);
  
  // Active: Status is 'active' or undefined (legacy)
  const activeAdsCount = myListings.filter(l => l.status === 'active' || !l.status).length;
  
  const totalViews = myListings.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const totalLikes = myListings.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  const formatCount = (num: number) => {
      if (num >= 1000) {
          return (num / 1000).toFixed(1).replace('.0', '') + 'k';
      }
      return num.toString();
  };

  const menuItems = {
    listings: [
      { 
        label: 'Manage My Ads', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
        action: () => onNavigate('my-ads') 
      },
      { 
        label: 'Post a New Ad', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        action: () => onNavigate('add-listing') 
      },
      { 
        label: 'View Analytics', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        action: () => onNavigate('vendor-analytics') 
      },
    ],
    growth: [
      { 
        label: 'Promote Business', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        action: () => onNavigate('promote-business') 
      },
      { 
        label: 'Refer & Earn', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.284-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.284.24-1.857m10 0A5 5 0 0013 11V7a4 4 0 00-8 0v4a5 5 0 00-4.24 5.143" /></svg>,
        action: () => onNavigate('referrals') 
      },
      { 
        label: 'Funds History', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
        action: () => onNavigate('wallet-history') 
      },
    ],
    activity: [
      {
        label: 'Notifications',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
        action: () => onNavigate('notifications')
      },
      { 
        label: 'My Favorites', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
        action: () => onNavigate('favorites') 
      },
      { 
        label: 'Saved Searches', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
        action: () => onNavigate('saved-searches') 
      },
    ],
    account: [
      { 
        label: 'Edit Profile', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
        action: () => onNavigate('edit-profile') 
      },
      { 
        label: 'Settings', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        action: () => onNavigate('settings') 
      },
      { 
        label: 'Help Center', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        action: () => alert('Feature coming soon!') 
      },
    ]
  };

  const renderMenuItem = (item: { label: string; icon: React.ReactElement; action: () => void; }) => (
    <button
      key={item.label}
      onClick={item.action}
      className="w-full flex items-center p-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
    >
      <span className="text-primary dark:text-gray-300 mr-4">{item.icon}</span>
      <span className="flex-grow font-medium">{item.label}</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-dark-surface p-5 rounded-xl shadow-md flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-primary text-primary">
           {user.profilePictureUrl ? (
               <img src={user.profilePictureUrl} alt={user.name} className="w-full h-full object-cover" />
           ) : (
               <span className="text-3xl font-bold">{user.name.charAt(0).toUpperCase()}</span>
           )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{user.name}</h1>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-md">
              <p className="text-2xl font-bold text-primary dark:text-dark-primary">{activeAdsCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Ads</p>
          </div>
          <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-md">
              <p className="text-2xl font-bold text-primary dark:text-dark-primary">{formatCount(totalViews)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Views</p>
          </div>
          <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-md">
              <p className="text-2xl font-bold text-primary dark:text-dark-primary">{formatCount(totalLikes)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Favorites</p>
          </div>
      </div>

      {/* Balance Section */}
      <div className="bg-gradient-to-r from-primary to-teal-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-center">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Available Balance</p>
                    {/* Safe check before toLocaleString */}
                    <h2 className="text-3xl font-bold">Rs. {(user.wallet?.balance || 0).toLocaleString()}</h2>
                </div>
                <button 
                    onClick={() => onNavigate('add-balance')}
                    className="bg-white text-primary px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors shadow-sm"
                >
                    + Add Funds
                </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
            <div className="absolute -left-6 -bottom-6 w-20 h-20 bg-white opacity-10 rounded-full"></div>
      </div>
      
      {/* Menu Sections */}
      <div className="space-y-4">
          <div className="bg-white dark:bg-dark-surface p-2 rounded-xl shadow-md">
              <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">MY LISTINGS</h3>
              {menuItems.listings.map(renderMenuItem)}
          </div>
          
          <div className="bg-white dark:bg-dark-surface p-2 rounded-xl shadow-md border border-yellow-100 dark:border-yellow-900/30">
              <h3 className="px-3 py-2 text-sm font-semibold text-yellow-600 dark:text-yellow-500">BUSINESS GROWTH & FINANCE</h3>
              {menuItems.growth.map(renderMenuItem)}
          </div>

          <div className="bg-white dark:bg-dark-surface p-2 rounded-xl shadow-md">
              <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">MY ACTIVITY</h3>
              {menuItems.activity.map(renderMenuItem)}
          </div>
           <div className="bg-white dark:bg-dark-surface p-2 rounded-xl shadow-md">
              <h3 className="px-3 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400">ACCOUNT</h3>
              {menuItems.account.map(renderMenuItem)}
          </div>
      </div>
      
      {/* Logout Button */}
      <div className="bg-white dark:bg-dark-surface p-2 rounded-xl shadow-md">
          <button
            onClick={onLogout}
            className="w-full flex items-center p-3 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <span className="mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </span>
            <span className="flex-grow font-medium">Logout</span>
          </button>
      </div>

    </div>
  );
};

export default AccountPage;
