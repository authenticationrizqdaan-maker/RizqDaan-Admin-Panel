
import React, { useState, useEffect, useMemo } from 'react';
import { User, Listing } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import ListingCard from '../common/ListingCard';

interface VendorProfilePageProps {
  vendorId: string;
  currentUser: User | null;
  listings: Listing[];
  onNavigate: (view: string, payload?: any) => void;
}

const VendorProfilePage: React.FC<VendorProfilePageProps> = ({ vendorId, currentUser, listings, onNavigate }) => {
  const [vendor, setVendor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'about'>('listings');
  const [followLoading, setFollowLoading] = useState(false);
  const [badgeThreshold, setBadgeThreshold] = useState(5); 

  const vendorListings = listings.filter(l => l.vendorId === vendorId && l.status !== 'draft');

  const averageRating = vendorListings.length > 0 
    ? vendorListings.reduce((acc, curr) => acc + curr.rating, 0) / vendorListings.length 
    : 0;

  useEffect(() => {
    if (!vendorId || !db) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const docRef = doc(db, 'users', vendorId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setVendor({ 
                id: docSnap.id, 
                name: data.name || 'Vendor',
                email: data.email || '',
                phone: data.phone || '',
                shopName: data.shopName || 'Business Name',
                shopAddress: data.shopAddress || '',
                isVerified: !!data.isVerified,
                profilePictureUrl: data.profilePictureUrl,
                coverPictureUrl: data.coverPictureUrl,
                bio: data.bio || '',
                followers: data.followers || [],
                referralStats: data.referralStats || { totalInvited: 0, totalEarned: 0 },
                ...data 
            } as User);
        } else {
            setVendor(null);
        }
        setLoading(false);
    }, (error: any) => {
        if (!error.message.includes('permission')) console.error("Vendor profile listen error", error.message);
        setLoading(false);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'referrals'), (snap) => {
        if (snap.exists()) setBadgeThreshold(snap.data().badgeThreshold || 5);
    }, (err) => {
        // Silent fail for non-admin metadata
    });

    return () => {
        unsubscribe();
        unsubSettings();
    };
  }, [vendorId]);

  const isFollowing = useMemo(() => {
      if (!currentUser || !vendor || !vendor.followers) return false;
      return vendor.followers.includes(currentUser.id);
  }, [currentUser, vendor]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      alert("Please login to follow vendors.");
      return;
    }
    if (!db || !vendor) return;

    setFollowLoading(true);
    const vendorRef = doc(db, 'users', vendor.id);

    try {
      if (isFollowing) {
        await updateDoc(vendorRef, {
          followers: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(vendorRef, {
          followers: arrayUnion(currentUser.id)
        });
      }
    } catch (error: any) {
      console.error("Error updating follow status", error.message);
    } finally {
      setFollowLoading(false);
    }
  };

  const hasStarBadge = (vendor?.referralStats?.totalInvited || 0) >= badgeThreshold;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vendor) {
    return <div className="p-8 text-center text-gray-500">Vendor not found.</div>;
  }

  return (
    <div className="animate-fade-in pb-20">
      <div className="bg-white dark:bg-dark-surface pb-6 shadow-sm mb-6">
        <div className="h-48 md:h-72 w-full bg-gray-200 dark:bg-gray-800 relative overflow-hidden group">
          {vendor.coverPictureUrl ? (
            <img src={vendor.coverPictureUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-700 to-slate-900"></div>
          )}
          <button 
             onClick={() => onNavigate('home')}
             className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-md transition-all z-10"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
          </button>
        </div>

        <div className="container mx-auto px-4 relative">
            <div className="flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-20 mb-4 relative z-20">
                <div className="relative">
                    <div className="h-32 w-32 md:h-40 md:w-40 rounded-full border-[5px] border-white dark:border-dark-surface bg-white shadow-md overflow-hidden">
                        {vendor.profilePictureUrl ? (
                            <img src={vendor.profilePictureUrl} alt={vendor.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl font-bold">
                                {(vendor.shopName || 'V').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-grow"></div>
                <div className="flex items-center gap-3 mt-4 md:mt-0 md:mb-2 w-full md:w-auto">
                    <button 
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg font-semibold shadow-sm transition-all border border-transparent ${
                            isFollowing 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-200'
                            : 'bg-primary text-white hover:bg-primary-dark'
                        }`}
                    >
                         {followLoading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>
                         ) : (
                            isFollowing ? 'Following' : 'Follow'
                         )}
                    </button>
                    <button 
                        onClick={() => {
                            if (currentUser && currentUser.id === vendor.id) {
                                alert("This is your profile."); return;
                            }
                            onNavigate('chats', { targetUser: { id: vendor.id, name: vendor.shopName || vendor.name } });
                        }}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Message
                    </button>
                </div>
            </div>

            <div className="mt-2">
                 <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                    {vendor.shopName}
                    {vendor.isVerified && (
                        <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    )}
                    {hasStarBadge && (
                        <div className="flex items-center bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full border border-yellow-200">
                            <span className="mr-1">🌟</span> Star Seller
                        </div>
                    )}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium">@{vendor.name}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm text-gray-600 dark:text-gray-300">
                     {vendor.shopAddress && (
                         <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {vendor.shopAddress}
                         </div>
                     )}
                     <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Joined {new Date().getFullYear()}
                     </div>
                </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mb-8">
        <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex justify-between md:justify-start md:gap-16">
            <div className="text-center md:text-left">
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">{vendor.followers?.length || 0}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Followers</span>
            </div>
            <div className="text-center md:text-left">
                <span className="block text-2xl font-bold text-gray-900 dark:text-white">{vendorListings.length}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Items</span>
            </div>
            <div className="text-center md:text-left">
                <span className="block text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-1">
                    {averageRating.toFixed(1)} <span className="text-yellow-400 text-xl">★</span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Rating</span>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
           <nav className="-mb-px flex space-x-8">
                <button
                    onClick={() => setActiveTab('listings')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'listings'
                        ? 'border-primary text-primary dark:text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                    }`}
                >
                    Products & Services
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'about'
                        ? 'border-primary text-primary dark:text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300'
                    }`}
                >
                    About & Reviews
                </button>
           </nav>
        </div>

        {activeTab === 'listings' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {vendorListings.length > 0 ? (
                    vendorListings.map(listing => (
                        <ListingCard 
                            key={listing.id} 
                            listing={listing} 
                            onViewDetails={(l) => onNavigate('details', { listing: l })} 
                        />
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">No active listings.</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <section>
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About Us</h3>
                         <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                {vendor.bio || "Welcome to our shop! We provide high quality products and services. Contact us for more details."}
                            </p>
                         </div>
                    </section>
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Recent Reviews</h3>
                        <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
                            {vendorListings.some(l => l.reviews.length > 0) ? (
                                 vendorListings.flatMap(l => l.reviews).slice(0, 5).map((review, idx) => (
                                     <div key={`${review.id}-${idx}`} className="p-5">
                                         <div className="flex justify-between items-center mb-2">
                                             <span className="font-semibold text-gray-900 dark:text-white">{review.author}</span>
                                             <span className="text-xs text-gray-400">{review.date}</span>
                                         </div>
                                         <div className="flex text-yellow-400 text-sm mb-2">
                                             {[...Array(5)].map((_, i) => (
                                                 <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                             ))}
                                         </div>
                                         <p className="text-gray-600 dark:text-gray-300 text-sm">{review.comment}</p>
                                     </div>
                                 ))
                             ) : (
                                 <div className="p-6 text-center text-gray-500 text-sm">No reviews yet.</div>
                             )}
                        </div>
                    </section>
                </div>
                <div className="space-y-6">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Contact Information</h4>
                        <ul className="space-y-4">
                            <li>
                                <span className="text-xs text-gray-400 block mb-1">Mobile</span>
                                <a href={`tel:${vendor.phone}`} className="text-primary dark:text-blue-400 font-medium hover:underline flex items-center gap-2">
                                    {vendor.phone}
                                </a>
                            </li>
                            <li>
                                <span className="text-xs text-gray-400 block mb-1">WhatsApp</span>
                                <a href={`https://wa.me/${vendor.phone}`} target="_blank" rel="noreferrer" className="text-green-600 font-medium hover:underline flex items-center gap-2">
                                    {vendor.phone}
                                </a>
                            </li>
                            <li>
                                <span className="text-xs text-gray-400 block mb-1">Email</span>
                                <a href={`mailto:${vendor.email}`} className="text-gray-700 dark:text-gray-300 font-medium hover:underline truncate block">
                                    {vendor.email}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VendorProfilePage;
