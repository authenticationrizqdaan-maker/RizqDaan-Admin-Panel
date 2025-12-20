
import React, { useState, useEffect } from 'react';
import { doc, deleteDoc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Listing, User } from '../../types';

interface ManageListingsProps {
    listings: Listing[]; 
    user: User | null;
    onEdit: (listing: Listing) => void;
    onPreview: (listing: Listing) => void;
    onPromote: (listing: Listing) => void;
}

type ListingFilter = 'all' | 'live' | 'draft' | 'featured';

const ManageListings: React.FC<ManageListingsProps> = ({ user, onEdit, onPreview, onPromote }) => {
  const [activeTab, setActiveTab] = useState<ListingFilter>('all');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
      if (!user?.id || !db) {
          setLoading(false);
          return;
      }

      setLoading(true);
      // Removed orderBy from query to fix "Missing Index" error
      const q = query(
          collection(db, "listings"),
          where("vendorId", "==", user.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
          
          // Client-side sort: Newest first (Bypasses need for Composite Index)
          items.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA;
          });

          setMyListings(items);
          setLoading(false);
      }, (err) => {
          console.error("Vendor listings listener error:", err.message);
          setLoading(false);
      });

      return () => unsubscribe();
  }, [user?.id]);

  const filteredListings = myListings.filter(listing => {
      const status = listing.status || 'active';
      if (activeTab === 'live') return status === 'active';
      if (activeTab === 'draft') return status === 'draft';
      if (activeTab === 'featured') return listing.isPromoted && status === 'active';
      return true;
  });

  const handleDeleteClick = (listingId: string) => {
      if (confirmDeleteId === listingId) {
          performDelete(listingId);
      } else {
          setConfirmDeleteId(listingId);
          setTimeout(() => {
              setConfirmDeleteId(prev => prev === listingId ? null : prev);
          }, 3000);
      }
  };

  const performDelete = async (listingId: string) => {
      if (!db) return;
      setDeletingId(listingId);
      setConfirmDeleteId(null);
      setErrorMsg(null);
      try {
          await deleteDoc(doc(db, "listings", listingId));
      } catch (e: any) {
          setErrorMsg(`Delete failed: ${e.message}`);
      } finally {
          setDeletingId(null);
      }
  };

  if (!user) return <div>Please log in.</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Your Listings</h3>
          {loading && <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>}
      </div>
      
      {errorMsg && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm relative">
              <p className="font-bold">Error</p>
              <p>{errorMsg}</p>
              <button onClick={() => setErrorMsg(null)} className="absolute top-2 right-2 text-red-500 font-bold">✕</button>
          </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
          {['all', 'live', 'draft', 'featured'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as ListingFilter)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    activeTab === tab
                    ? 'border-primary text-primary dark:text-white bg-gray-50 dark:bg-gray-700/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} 
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded-full">
                    {tab === 'all' 
                        ? myListings.length 
                        : myListings.filter(l => {
                            const status = l.status || 'active';
                            if (tab === 'live') return status === 'active';
                            if (tab === 'draft') return status === 'draft';
                            if (tab === 'featured') return l.isPromoted && status === 'active';
                            return false;
                        }).length
                    }
                  </span>
              </button>
          ))}
      </div>

      {loading && myListings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500">Loading...</p>
          </div>
      ) : filteredListings.length === 0 ? (
           <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No items found here.</p>
           </div>
      ) : (
        <div className="space-y-6">
            {filteredListings.map(listing => (
            <div key={listing.id} className={`flex flex-col p-4 bg-white dark:bg-dark-surface rounded-xl shadow-md border ${listing.isPromoted ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="flex flex-row gap-4 mb-4">
                    <div className="relative w-24 h-24 flex-shrink-0">
                         <img src={listing.imageUrl} alt={listing.title} className="w-full h-full rounded-lg object-cover bg-gray-200" />
                         {listing.isPromoted && <span className="absolute -top-2 -left-2 bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">FEATURED</span>}
                    </div>
                    <div className="flex-grow">
                        <div className="flex justify-between items-start">
                             <div>
                                <h4 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1">{listing.title}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Rs.{listing.price}</p>
                             </div>
                             <button onClick={() => onPreview(listing)} className="text-xs text-primary hover:underline">Preview &rarr;</button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-3">
                             <div className="text-center bg-gray-50 dark:bg-gray-700 rounded p-1">
                                 <span className="block text-[10px] text-gray-400 uppercase">Views</span>
                                 <span className="font-bold text-primary dark:text-white text-xs">{listing.views || 0}</span>
                             </div>
                             <div className="text-center bg-gray-50 dark:bg-gray-700 rounded p-1">
                                 <span className="block text-[10px] text-gray-400 uppercase">Calls</span>
                                 <span className="font-bold text-blue-500 text-xs">{listing.calls || 0}</span>
                             </div>
                             <div className="text-center bg-gray-50 dark:bg-gray-700 rounded p-1">
                                 <span className="block text-[10px] text-gray-400 uppercase">Rating</span>
                                 <span className="font-bold text-yellow-500 text-xs">{listing.rating.toFixed(1)}</span>
                             </div>
                             <div className="text-center bg-gray-50 dark:bg-gray-700 rounded p-1">
                                 <span className="block text-[10px] text-gray-400 uppercase">Likes</span>
                                 <span className="font-bold text-red-500 text-xs">{listing.likes || 0}</span>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <button onClick={() => !listing.isPromoted && onPromote(listing)} className="px-3 py-2 text-xs font-bold rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors">Promote</button>
                    <button onClick={() => onEdit(listing)} className="px-3 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteClick(listing.id)} className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${confirmDeleteId === listing.id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>
                        {deletingId === listing.id ? '...' : (confirmDeleteId === listing.id ? 'Confirm?' : 'Delete')}
                    </button>
                </div>
            </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ManageListings;
