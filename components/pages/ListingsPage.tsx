
import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../../constants';
import { Listing } from '../../types';
import ListingCard from '../common/ListingCard';

interface ListingsPageProps {
  listings: Listing[];
  onNavigate: (view: 'details', payload: { listing: Listing }) => void;
  initialSearchTerm?: string;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ListingsPage: React.FC<ListingsPageProps> = ({ listings, onNavigate, initialSearchTerm = '', loadMore, hasMore, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false); 

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const filteredListings = listings.filter(listing => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch = searchTermLower === '' ? true : (
      listing.title.toLowerCase().includes(searchTermLower) ||
      listing.description.toLowerCase().includes(searchTermLower) ||
      listing.category.toLowerCase().includes(searchTermLower) ||
      listing.vendorName.toLowerCase().includes(searchTermLower)
    );
    const matchesCategory = selectedCategory === 'All' || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
      if (a.isPromoted === b.isPromoted) return 0; 
      return a.isPromoted ? -1 : 1;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      {/* Filters Sidebar */}
      <aside className="w-full md:w-1/4 lg:w-1/5">
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden sticky top-20">
          
          <div className="p-4 border-b md:border-b-0 border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 hidden md:block">Filters</h3>
            
            <div className="relative">
                <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="block w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary transition-all outline-none text-sm"
                />
                <div className="absolute right-3 top-3 text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            <button 
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="md:hidden w-full mt-3 flex items-center justify-between px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedCategory === 'All' ? 'Categories' : selectedCategory}
                </span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
          </div>

          <div className={`p-4 pt-0 ${isCategoryOpen ? 'block' : 'hidden md:block'}`}>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 hidden md:block mt-4">Category</h4>
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {['All', ...CATEGORIES.map(c => c.name)].map(category => (
                <li key={category}>
                  <button
                    onClick={() => {
                        setSelectedCategory(category);
                        setIsCategoryOpen(false); 
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Listings Content */}
      <main className="w-full md:w-3/4 lg:w-4/5">
        <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {searchTerm ? `Results for "${searchTerm}"` : (selectedCategory === 'All' ? 'All Listings' : `${selectedCategory}`)}
                <span className="ml-2 text-xs font-normal text-gray-500">({filteredListings.length} loaded)</span>
            </h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredListings.length > 0 ? (
            filteredListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} onViewDetails={(l) => onNavigate('details', { listing: l })} />
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
                <div className="inline-block p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                    <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No items found</h3>
                <p className="text-gray-500 text-sm mt-1">Try a different search or category.</p>
            </div>
          )}
        </div>

        {/* PAGINATION FOOTER */}
        {hasMore && (
            <div className="mt-12 flex justify-center pb-10">
                <button 
                    onClick={loadMore}
                    disabled={isLoading}
                    className="px-8 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl text-primary dark:text-white font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></span>
                            Loading...
                        </>
                    ) : (
                        "Load More Results"
                    )}
                </button>
            </div>
        )}
      </main>
    </div>
  );
};

export default ListingsPage;
