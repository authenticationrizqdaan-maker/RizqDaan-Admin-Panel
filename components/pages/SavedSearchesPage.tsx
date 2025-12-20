
import React from 'react';

interface SavedSearchesPageProps {
  onNavigate: (view: 'account' | 'listings', payload?: { query?: string }) => void;
  searches: string[];
}

const SavedSearchesPage: React.FC<SavedSearchesPageProps> = ({ onNavigate, searches }) => {

  return (
    <div className="animate-fade-in">
      <header className="flex items-center mb-6">
        <button
          onClick={() => onNavigate('account')}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Back to account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">Saved Searches</h1>
      </header>
      
      <div className="space-y-3">
        {searches.length > 0 ? (
          searches.map((search, index) => (
            <button
              key={index}
              onClick={() => onNavigate('listings', { query: search })}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left"
            >
              <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{search}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          ))
        ) : (
          <div className="text-center py-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No saved searches</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You can save searches from the listings page.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedSearchesPage;
