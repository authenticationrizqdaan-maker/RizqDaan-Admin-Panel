import React from 'react';

type View = 'home' | 'chats' | 'add-listing' | 'my-ads' | 'account' | 'listings' | 'vendor-dashboard';

interface BottomNavBarProps {
  onNavigate: (view: View) => void;
  activeView: string;
}

const NavItem: React.FC<{
  label: string;
  view: View;
  // FIX: Changed JSX.Element to React.ReactElement to fix TypeScript namespace error.
  icon: React.ReactElement;
  onNavigate: (view: View) => void;
  isActive: boolean;
}> = ({ label, view, icon, onNavigate, isActive }) => (
  <button
    onClick={() => onNavigate(view)}
    className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
      isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
    }`}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onNavigate, activeView }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-dark-surface shadow-[0_-2px_5px_rgba(0,0,0,0.1)] z-50 md:hidden">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto">
        <NavItem
          label="Home"
          view="home"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
          onNavigate={onNavigate}
          isActive={activeView === 'home'}
        />
        <NavItem
          label="Chats"
          view="chats"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          onNavigate={onNavigate}
          isActive={activeView === 'chats'}
        />
        
        {/* Sell Button */}
        <div className="relative -mt-6">
            <button onClick={() => onNavigate('add-listing')} className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-gray-300 shadow-md">
                <div className="absolute inset-0.5 rounded-full" style={{background: 'conic-gradient(from 180deg at 50% 50%, #3A77FF 0deg, #23E5DB 120deg, #FFC800 240deg, #3A77FF 360deg)'}}></div>
                <div className="relative w-14 h-14 bg-white dark:bg-gray-300 rounded-full flex items-center justify-center">
                   <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
            </button>
        </div>

        <NavItem
          label="My Ads"
          view="my-ads"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          onNavigate={onNavigate}
          isActive={activeView === 'my-ads' || activeView === 'vendor-dashboard'}
        />
        <NavItem
          label="Account"
          view="account"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          onNavigate={onNavigate}
          isActive={activeView === 'account'}
        />
      </div>
    </footer>
  );
};

export default BottomNavBar;