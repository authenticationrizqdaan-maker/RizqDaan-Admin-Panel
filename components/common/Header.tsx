
import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  onNavigate: (view: 'home' | 'listings' | 'vendor-dashboard' | 'notifications') => void;
  toggleTheme: () => void;
  currentTheme: string;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ onNavigate, toggleTheme, currentTheme, user }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
      if (!user?.id || !db) {
          setUnreadCount(0);
          return;
      }
      const q = query(collection(db, 'notifications'), where('userId', '==', user.id), where('isRead', '==', false));
      const unsubscribe = onSnapshot(q, (snap) => setUnreadCount(snap.size));
      return () => unsubscribe();
  }, [user?.id]);

  return (
    <header className="bg-white dark:bg-dark-surface shadow-sm sticky top-0 z-50 hidden md:block">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="text-xl font-bold text-primary dark:text-white cursor-pointer" onClick={() => onNavigate('home')}>
             RizqDaan
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="text-gray-600 dark:text-gray-300 hover:text-primary font-medium">Home</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('listings'); }} className="text-gray-600 dark:text-gray-300 hover:text-primary font-medium">Listings</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('vendor-dashboard'); }} className="text-gray-600 dark:text-gray-300 hover:text-primary font-medium">Vendor Dashboard</a>
          </nav>
          <div className="flex items-center space-x-4">
            {user && (
                <button onClick={() => onNavigate('notifications')} className="p-2 text-gray-500 relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
                </button>
            )}
             <button onClick={() => onNavigate('vendor-dashboard')} className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-all">
              List your Business
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
