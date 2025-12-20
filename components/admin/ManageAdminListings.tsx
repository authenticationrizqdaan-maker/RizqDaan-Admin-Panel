
import React, { useState, useEffect } from 'react';
import { Listing } from '../../types';
import { CATEGORIES } from '../../constants';
import { doc, updateDoc, deleteDoc, collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

interface ManageAdminListingsProps {
  listings: Listing[];
  onDeleteListing: (listingId: string) => void;
  onNavigate: (view: string, payload?: any) => void;
}

const ManageAdminListings: React.FC<ManageAdminListingsProps> = ({ onDeleteListing }) => {
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'price-high' | 'price-low'>('newest');

  useEffect(() => {
      if (!db) return;
      setLoading(true);
      
      // Simple query avoids composite index errors
      const q = query(collection(db, 'listings'), limit(100));

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
          setDbListings(fetched);
          setLoading(false);
      }, (err) => {
          console.error("Admin listings error:", err.message);
          setLoading(false);
      });

      return () => unsubscribe();
  }, []);

  const filteredAndSorted = dbListings
    .filter(l => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || l.title.toLowerCase().includes(term) || l.vendorName.toLowerCase().includes(term);
        const matchesCat = selectedCategory === 'All' || l.category === selectedCategory;
        const matchesStat = selectedStatus === 'All' || (l.status || 'active') === selectedStatus;
        return matchesSearch && matchesCat && matchesStat;
    })
    .sort((a, b) => {
        if (sortOrder === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortOrder === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortOrder === 'price-high') return b.price - a.price;
        if (sortOrder === 'price-low') return a.price - b.price;
        return 0;
    });

  const updateStatus = async (id: string, newStatus: string) => {
      if (!db) return;
      await updateDoc(doc(db, 'listings', id), { status: newStatus });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            Admin Ads Monitor
            {loading && <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></span>}
        </h2>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white outline-none" />
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="pending">Review</option>
          </select>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white font-bold">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price High</option>
              <option value="price-low">Price Low</option>
          </select>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-dark-surface rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase">Listing</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {filteredAndSorted.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                        <img src={l.imageUrl} className="h-10 w-10 rounded object-cover" alt="" />
                        <div>
                            <p className="text-sm font-bold dark:text-white line-clamp-1">{l.title}</p>
                            <p className="text-[10px] text-gray-500">{l.vendorName}</p>
                        </div>
                    </div>
                </td>
                <td className="px-4 py-4">
                  <select value={l.status || 'active'} onChange={e => updateStatus(l.id, e.target.value)} className="text-xs p-1 border rounded bg-transparent">
                      <option value="active">Active</option>
                      <option value="pending">Review</option>
                      <option value="draft">Draft</option>
                  </select>
                </td>
                <td className="px-4 py-4 text-right">
                   <button onClick={() => onDeleteListing(l.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAndSorted.length === 0 && <div className="p-10 text-center text-gray-500">No results.</div>}
      </div>
    </div>
  );
};

export default ManageAdminListings;
