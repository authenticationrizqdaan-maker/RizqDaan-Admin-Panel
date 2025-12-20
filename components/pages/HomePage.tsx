
import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORIES as DEFAULT_CATEGORIES, PAKISTAN_LOCATIONS, ICONS } from '../../constants';
import { Listing, Category, HomeBanner } from '../../types';
import ListingCard from '../common/ListingCard';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface HomePageProps {
  listings: Listing[];
  categories?: Category[]; // Made optional to support default if not passed
  onNavigate: (view: 'listings' | 'details' | 'subcategories', payload?: { listing?: Listing; category?: Category; query?: string }) => void;
  onSaveSearch: (query: string) => void;
}

// Helper to shuffle array for random listings
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// Fallback Banners if DB is empty
const DEFAULT_BANNERS: HomeBanner[] = [
    { id: '1', title: "MEGA SALE", subtitle: "Up to 70% OFF on Electronics", color: "from-blue-600 to-blue-800", icon: "⚡", isActive: true, order: 0 },
    { id: '2', title: "FRESH FOOD", subtitle: "Order Home Chef Meals Today", color: "from-orange-500 to-red-500", icon: "🍔", isActive: true, order: 1 },
    { id: '3', title: "FASHION WEEK", subtitle: "New Summer Collection Arrival", color: "from-pink-500 to-rose-500", icon: "👗", isActive: true, order: 2 },
];

const HomePage: React.FC<HomePageProps> = ({ listings, categories = [], onNavigate, onSaveSearch }) => {
  const [banners, setBanners] = useState<HomeBanner[]>(DEFAULT_BANNERS);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // Use passed categories or fall back to constants
  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  // Priority: Is Promoted -> Newest
  const sortedListings = [...listings].sort((a, b) => {
      if (a.isPromoted && !b.isPromoted) return -1;
      if (!a.isPromoted && b.isPromoted) return 1;
      return 0;
  });

  const featuredListings = sortedListings.filter(l => l.isPromoted).slice(0, 10);
  const remainingListings = sortedListings.filter(l => !l.isPromoted);
  
  const [randomListings, setRandomListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // --- FILTER STATE ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [locationData, setLocationData] = useState({ province: '', city: '', isGps: false });
  const [filters, setFilters] = useState({
      verifiedOnly: false,
      openNow: false,
      freeDelivery: false,
      onSale: false
  });
  const [gpsLoading, setGpsLoading] = useState(false);

  // Touch state for swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // --- FETCH BANNERS ---
  useEffect(() => {
      if (!db) return;
      const q = query(collection(db, 'banners'), where('isActive', '==', true));
      
      const unsub = onSnapshot(q, (snap) => {
          let fetchedBanners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeBanner));
          
          if (fetchedBanners.length > 0) {
              fetchedBanners.sort((a, b) => (a.order || 0) - (b.order || 0));
              setBanners(fetchedBanners);
          } else {
              setBanners(DEFAULT_BANNERS);
          }
      }, (err) => {
          console.error("Banners fetch error:", err.message);
      });
      return () => unsub();
  }, []);

  useEffect(() => {
    if (remainingListings.length > 0) {
      setRandomListings(shuffleArray([...remainingListings]).slice(0, 8));
    }
  }, [listings]); 

  // --- BANNER AUTO-SCROLL LOGIC ---
  useEffect(() => {
      if (banners.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); 
      return () => clearInterval(interval);
  }, [banners.length]);

  const onTouchStart = (e: React.TouchEvent) => {
      setTouchEnd(null); 
      setTouchStart(e.targetTouches[0].clientX);
  }

  const onTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
  }

  const onTouchEnd = () => {
      if (!touchStart || !touchEnd || banners.length <= 1) return;
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
          setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }
      if (isRightSwipe) {
          setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
      }
  }

  const handleBannerClick = (banner: HomeBanner) => {
      if (!banner.link) return;
      
      const targetListing = listings.find(l => l.id === banner.link);
      if (targetListing) {
          onNavigate('details', { listing: targetListing });
      } else {
          onNavigate('listings', { query: banner.link });
      }
  };

  const loadMoreListings = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const newItems = shuffleArray([...remainingListings]).slice(0, 4);
      setRandomListings(prev => [...prev, ...newItems]);
      setIsLoading(false);
    }, 700);
  }, [remainingListings]);

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop + 200 >= document.documentElement.scrollHeight && !isLoading) {
      loadMoreListings();
    }
  }, [isLoading, loadMoreListings]);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('listings', { query: searchQuery });
    }
  };

  const handleGetLocation = () => {
      if (!navigator.geolocation) {
          alert("Geolocation is not supported by this browser.");
          return;
      }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition((pos) => {
          setGpsLoading(false);
          setLocationData({ province: '', city: '', isGps: true });
      }, (err) => {
          setGpsLoading(false);
          alert("Could not get location. Please enable GPS.");
      });
  };

  const handleApplyFilters = () => {
      setIsFilterOpen(false);
      const filterSummary = [];
      if (locationData.city) filterSummary.push(locationData.city);
      if (filters.verifiedOnly) filterSummary.push("Verified");
      if (filters.onSale) filterSummary.push("On Sale");
      
      const query = filterSummary.length > 0 ? filterSummary.join(" ") : "All Listings";
      onNavigate('listings', { query });
  };

  const renderIcon = (icon: any) => {
      if (React.isValidElement(icon)) return icon;
      if (typeof icon === 'string' && ICONS[icon as keyof typeof ICONS]) {
          return ICONS[icon as keyof typeof ICONS];
      }
      return <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>;
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const locationDisplay = locationData.isGps 
    ? "📍 Current Location" 
    : (locationData.city ? `${locationData.city}` : "Pakistan");

  return (
    <div className="space-y-3">
      
      {/* --- COMPACT HEADER & SEARCH --- */}
      <div className="bg-primary dark:bg-dark-primary py-2 px-4 rounded-b-xl shadow-sm -mx-4 mb-2 transition-all sticky top-0 z-40">
        <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-2">
                <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center text-white/90 hover:text-white text-xs font-medium truncate max-w-[70%]"
                >
                    <svg className="w-3.5 h-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    <span className="truncate">{locationDisplay}</span>
                    <svg className="w-3 h-3 ml-0.5 text-white/70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                <div className="text-white text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">RizqDaan</div>
            </div>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                 <input
                    type="text"
                    placeholder="Search anything..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-lg border-0 bg-white text-gray-800 focus:ring-0 shadow-sm text-sm transition-all placeholder-gray-400"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <button type="button" onClick={() => setIsFilterOpen(true)} className="absolute right-2 p-1 text-gray-400 hover:text-primary transition-colors border-l border-gray-200 pl-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>
            </form>
        </div>
      </div>

      {/* --- BANNER CAROUSEL (DYNAMIC) --- */}
      <div 
        className="relative w-full overflow-hidden rounded-xl shadow-sm group h-36 sm:h-48 md:h-56 touch-pan-y cursor-pointer"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
          <div 
            className="flex transition-transform duration-500 ease-in-out h-full"
            style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
          >
              {banners.map((banner) => (
                  <div 
                    key={banner.id} 
                    onClick={() => handleBannerClick(banner)}
                    className={`min-w-full h-full flex items-center justify-between px-5 md:px-12 text-white relative overflow-hidden`}
                  >
                      {/* Background Layer */}
                      {banner.imageUrl ? (
                          <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover z-0" alt="" />
                      ) : (
                          <div className={`absolute inset-0 bg-gradient-to-r ${banner.color} z-0`}></div>
                      )}

                      <div className="z-10 max-w-[65%]">
                          {banner.title && (
                              <>
                                  <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 inline-block border border-white/30 backdrop-blur-sm">Promotion</span>
                                  <h2 className="text-xl md:text-3xl font-extrabold mb-1 drop-shadow-md leading-tight uppercase">{banner.title}</h2>
                              </>
                          )}
                          {banner.subtitle && (
                              <p className="text-xs md:text-sm font-medium opacity-90 mb-3 drop-shadow-sm">{banner.subtitle}</p>
                          )}
                      </div>
                      
                      {!banner.imageUrl && (
                          <div className="text-[60px] md:text-[100px] opacity-20 absolute right-2 md:right-10 rotate-12 pointer-events-none select-none z-10">
                            {banner.icon}
                          </div>
                      )}
                  </div>
              ))}
          </div>

          {banners.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
                {banners.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentBannerIndex(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            index === currentBannerIndex ? 'bg-white w-4' : 'bg-white/50'
                        }`}
                    />
                ))}
            </div>
          )}
      </div>

      {/* --- CATEGORIES --- */}
      <div>
        <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Categories</h3>
            <span className="text-[10px] text-primary font-medium cursor-pointer" onClick={() => onNavigate('listings')}>View All</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-2">
          {displayCategories.slice(0, 8).map((category) => (
            <div
              key={category.id}
              onClick={() => onNavigate('subcategories', { category })}
              className="group flex flex-col items-center p-1.5 bg-white dark:bg-dark-surface rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer text-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              <div className="h-8 w-8 flex items-center justify-center text-primary dark:text-gray-200 mb-1">
                {renderIcon(category.icon)}
              </div>
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 leading-tight line-clamp-1">{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- FEATURED LISTINGS --- */}
      <div>
        <div className="flex justify-between items-center mb-2 mt-2 px-1">
            <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1">
                🔥 Featured Listings
            </h2>
            <span className="text-[10px] text-primary font-medium cursor-pointer" onClick={() => onNavigate('listings')}>See All</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {featuredListings.length > 0 ? featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onViewDetails={(l) => onNavigate('details', { listing: l })} />
          )) : <p className="col-span-full text-center text-xs text-gray-500 py-4">No featured items.</p>}
        </div>
      </div>

      <hr className="border-gray-100 dark:border-gray-800 my-2" />

      {/* --- RANDOM LISTINGS --- */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 dark:text-white mb-2 px-1">Fresh Recommendations</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {randomListings.map((listing, index) => (
            <ListingCard key={`${listing.id}-${index}`} listing={listing} onViewDetails={(l) => onNavigate('details', { listing: l })} />
          ))}
        </div>
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsFilterOpen(false)}></div>
              <div className="relative bg-white dark:bg-dark-surface w-full md:w-[400px] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh] animate-slide-up">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-base font-bold text-gray-800 dark:text-white">Filter & Sort</h3>
                      <button onClick={() => setIsFilterOpen(false)} className="text-gray-500">✕</button>
                  </div>
                  <div className="p-4 space-y-4 overflow-y-auto">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Location</label>
                          <button onClick={handleGetLocation} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm mb-2 bg-gray-50 text-gray-700">
                              {gpsLoading ? 'Locating...' : '📍 Use Current Location'}
                          </button>
                          <select className="w-full p-2 bg-gray-50 border rounded-lg text-sm" value={locationData.province} onChange={(e) => setLocationData({ ...locationData, province: e.target.value, city: '' })}>
                              <option value="">Select Province</option>
                              {Object.keys(PAKISTAN_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Options</label>
                          <div className="space-y-2">
                              <label className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium">Verified Only</span>
                                  <input type="checkbox" checked={filters.verifiedOnly} onChange={() => setFilters({...filters, verifiedOnly: !filters.verifiedOnly})} className="w-4 h-4 text-primary rounded" />
                              </label>
                              <label className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium">Free Delivery</span>
                                  <input type="checkbox" checked={filters.freeDelivery} onChange={() => setFilters({...filters, freeDelivery: !filters.freeDelivery})} className="w-4 h-4 text-primary rounded" />
                              </label>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex gap-2">
                      <button onClick={() => { setLocationData({province:'', city:'', isGps:false}); setFilters({verifiedOnly:false, freeDelivery:false, openNow:false, onSale:false}); }} className="flex-1 py-2.5 text-gray-600 font-medium border rounded-lg text-sm">Reset</button>
                      <button onClick={handleApplyFilters} className="flex-[2] py-2.5 bg-primary text-white font-bold rounded-lg text-sm">Show Results</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HomePage;
