
import React, { useState, useEffect } from 'react';
import { User, Listing } from '../../types';
import ListingCard from '../common/ListingCard';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface FavoritesPageProps {
  user: User;
  listings: Listing[];
  // Fix: Added 'listings' to allowed views and 'query' to optional payload to resolve TypeScript error on line 108
  onNavigate: (view: 'account' | 'details' | 'listings', payload?: { listing?: Listing; query?: string }) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ user, listings, onNavigate }) => {
  // Local state to handle immediate UI updates before the parent 'user' prop updates
  const [localFavoriteIds, setLocalFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
      setLocalFavoriteIds(user.favorites || []);
  }, [user.favorites]);

  // Filter listings based on local state
  const favoriteListings = listings.filter(l => localFavoriteIds.includes(l.id));

  const handleRemoveFavorite = async (e: React.MouseEvent, listingId: string) => {
      e.stopPropagation(); // Prevent navigating to details
      
      // 1. Optimistic Update
      const updatedIds = localFavoriteIds.filter(id => id !== listingId);
      setLocalFavoriteIds(updatedIds);

      // 2. Update Local Storage (Sync with App.tsx)
      try {
          const demoFavs = JSON.parse(localStorage.getItem('demo_user_favorites') || '{}');
          demoFavs[user.id] = updatedIds;
          localStorage.setItem('demo_user_favorites', JSON.stringify(demoFavs));
          
          // Notify App to update global user state
          window.dispatchEvent(new Event('favorites_updated'));
      } catch (error: any) {
          // Log string only to prevent circular structure errors
          console.error("Local storage error:", error?.message || String(error));
      }

      // 3. Update Firestore
      if (db) {
          try {
              const userRef = doc(db, 'users', user.id);
              
              // We don't await these to keep UI snappy, errors logged to console
              updateDoc(userRef, { favorites: arrayRemove(listingId) });
              
              // Ideally decrement likes on listing too, but optional for favorites view
              // updateDoc(listingRef, { likes: increment(-1) }); 
          } catch (e: any) {
              console.error("Error removing favorite:", e.message || String(e));
          }
      }
  };

  return (
    <div className="animate-fade-in pb-20">
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
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">My Favorites</h1>
        <span className="ml-2 text-sm text-gray-500 font-medium">({localFavoriteIds.length})</span>
      </header>
      
      {favoriteListings.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favoriteListings.map((listing) => (
            <div key={listing.id} className="relative group">
                <ListingCard listing={listing} onViewDetails={(l) => onNavigate('details', { listing: l })} />
                
                {/* Remove Button Overlay */}
                <button
                    onClick={(e) => handleRemoveFavorite(e, listing.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-full text-red-500 shadow-sm hover:bg-red-50 dark:hover:bg-gray-700 transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Remove from favorites"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No favorites yet</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
            Items you mark with a heart <span className="text-red-500">♥</span> will appear here.
          </p>
          <button 
            onClick={() => onNavigate('listings', { query: '' })} 
            className="mt-6 px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Explore Listings
          </button>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
