
import React, { useState, useEffect } from 'react';
import { Listing, User, Review } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, getDocs, query, collection, where, setDoc } from 'firebase/firestore';
import ListingCard from '../common/ListingCard';

interface ListingDetailsPageProps {
  listing: Listing;
  listings: Listing[];
  user: User | null;
  onNavigate: (view: 'listings' | 'details' | 'chats' | 'vendor-profile', payload?: { listing?: Listing, targetUser?: { id: string, name: string }, targetVendorId?: string }) => void;
}

const SectionWrapper = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <section className={`w-full bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-gray-800 p-4 md:px-8 ${className}`}>
        {children}
    </section>
);

const ListingDetailsPage: React.FC<ListingDetailsPageProps> = ({ listing, listings, user, onNavigate }) => {
    const [reviews, setReviews] = useState<Review[]>(listing.reviews || []);
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [vendorData, setVendorData] = useState<User | null>(null);
    const [vendorStats, setVendorStats] = useState({ rating: 0, reviewCount: 0 });
    const images = listing.images && listing.images.length > 0 ? listing.images : [listing.imageUrl];
    const [activeImage, setActiveImage] = useState(images[0]);
    const [isFavorite, setIsFavorite] = useState(false);
    const [contactPopup, setContactPopup] = useState<{ isOpen: boolean; type: 'call' | 'whatsapp'; number: string } | null>(null);
    const relatedListings = listings.filter(l => l.category === listing.category && l.id !== listing.id).slice(0, 6);

    useEffect(() => {
        setReviews(listing.reviews || []);
        const currentImages = listing.images && listing.images.length > 0 ? listing.images : [listing.imageUrl];
        setActiveImage(currentImages[0]);
        window.scrollTo(0, 0);
    }, [listing.id]);

    useEffect(() => {
        if (user && user.favorites) setIsFavorite(user.favorites.includes(listing.id));
    }, [user, listing.id]);

    // --- CORE SYNC LOGIC: TRACK CONVERSION ---
    const trackConversion = async (type: 'call' | 'msg' | 'wa') => {
        if (!db) return;
        try {
            // 1. Update listing document with specific interaction type
            const listingRef = doc(db, 'listings', listing.id);
            const field = type === 'call' ? 'calls' : 'messages';
            await updateDoc(listingRef, { [field]: increment(1) });

            // 2. If it's a promoted listing, update campaign conversions
            if (listing.isPromoted) {
                const q = query(
                    collection(db, 'campaigns'), 
                    where('listingId', '==', listing.id),
                    where('status', '==', 'active')
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    await updateDoc(snap.docs[0].ref, { conversions: increment(1) });
                }
            }
        } catch (e) {
            console.warn("Conversion tracking failed", e);
        }
    };

    useEffect(() => {
        const fetchVendorInfo = async () => {
            if (!db || !listing.vendorId) return;
            try {
                const userSnap = await getDoc(doc(db, "users", listing.vendorId));
                if (userSnap.exists()) setVendorData(userSnap.data() as User);
                const q = query(collection(db, "listings"), where("vendorId", "==", listing.vendorId));
                const querySnapshot = await getDocs(q);
                let totalRating = 0; let count = 0;
                querySnapshot.forEach((doc) => {
                    const l = doc.data();
                    if (l.rating > 0) { totalRating += l.rating; count++; }
                });
                setVendorStats({ rating: count > 0 ? totalRating / count : 0, reviewCount: count });
            } catch (e) {}
        };
        fetchVendorInfo();
    }, [listing.vendorId]);

    const handleToggleFavorite = async () => {
        if (!user) { alert("Please login to save favorites."); return; }
        const wasFavorite = isFavorite;
        setIsFavorite(!wasFavorite);
        if (!db) return;
        const userRef = doc(db, 'users', user.id);
        const listingRef = doc(db, 'listings', listing.id);
        try {
            if (wasFavorite) {
                await setDoc(userRef, { favorites: arrayRemove(listing.id) }, { merge: true });
                await updateDoc(listingRef, { likes: increment(-1) }).catch(() => {});
            } else {
                await setDoc(userRef, { favorites: arrayUnion(listing.id) }, { merge: true });
                await updateDoc(listingRef, { likes: increment(1) }).catch(() => {});
            }
        } catch (e) {}
    };

    const handleActionClick = (type: 'call' | 'msg' | 'wa') => {
        trackConversion(type);
        const sellerPhone = vendorData?.phone || listing.contact.phone;
        if (type === 'call') setContactPopup({ isOpen: true, type: 'call', number: sellerPhone });
        else if (type === 'wa') setContactPopup({ isOpen: true, type: 'whatsapp', number: sellerPhone });
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newRating === 0 || !newComment.trim() || !user) return;
        setIsSubmittingReview(true);
        const newReview: Review = { id: `r-${Date.now()}`, author: user.name, rating: newRating, comment: newComment.trim(), date: new Date().toISOString().split('T')[0] };
        setReviews([newReview, ...reviews]);
        setIsReviewFormOpen(false);
        if(db) await updateDoc(doc(db, 'listings', listing.id), { reviews: arrayUnion(newReview) }).catch(() => {});
        setIsSubmittingReview(false);
    };

    const discountPercent = listing.originalPrice ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100) : 0;

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen pb-32 relative">
      <div className="w-full bg-black relative group aspect-[4/3] md:aspect-[16/7] overflow-hidden">
          <img src={activeImage} alt={listing.title} className="w-full h-full object-contain" />
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent z-10">
              <button onClick={() => onNavigate('listings')} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex gap-2">
                  <button onClick={handleToggleFavorite} className={`p-2 bg-white/20 backdrop-blur-md rounded-full ${isFavorite ? 'text-red-500' : 'text-white'}`}>
                      <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </button>
              </div>
          </div>
          <div className="absolute bottom-4 left-4 flex gap-2">
              {listing.isPromoted && <span className="bg-accent-yellow text-primary text-[10px] font-black px-3 py-1 rounded shadow-lg uppercase tracking-tighter">Featured</span>}
              {discountPercent > 0 && <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg">-{discountPercent}% OFF</span>}
          </div>
          {images.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-1">
                  {images.map((_, i) => (
                      <div key={i} className={`h-1.5 rounded-full transition-all ${images[i] === activeImage ? 'w-6 bg-white' : 'w-1.5 bg-white/40'}`}></div>
                  ))}
              </div>
          )}
      </div>

      {images.length > 1 && (
          <div className="w-full bg-white dark:bg-dark-surface p-2 flex gap-2 overflow-x-auto border-b border-gray-100 dark:border-gray-800 scrollbar-hide">
              {images.map((img, idx) => (
                  <button key={idx} onClick={() => setActiveImage(img)} className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${activeImage === img ? 'border-primary' : 'border-transparent'}`}>
                      <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
              ))}
          </div>
      )}

      <SectionWrapper>
          <div className="flex justify-between items-end mb-2">
              <div>
                  <h2 className="text-3xl font-black text-primary dark:text-white leading-tight">Rs. {listing.price.toLocaleString()}</h2>
                  {listing.originalPrice && <p className="text-sm text-gray-400 line-through">Rs. {listing.originalPrice.toLocaleString()}</p>}
              </div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">ID: {listing.id.substring(0, 8)}</div>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{listing.title}</h1>
          <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="font-medium">{listing.location}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-bold">{new Date(listing.createdAt || Date.now()).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
          </div>
      </SectionWrapper>

      <SectionWrapper>
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Description</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">{listing.description}</p>
      </SectionWrapper>

      <SectionWrapper>
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Seller Information</h3>
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => onNavigate('vendor-profile', { targetVendorId: listing.vendorId })}>
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/5 flex items-center justify-center">
                  {vendorData?.profilePictureUrl ? (
                      <img src={vendorData.profilePictureUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                      <span className="text-2xl font-black text-primary">{(vendorData?.shopName || listing.vendorName).charAt(0)}</span>
                  )}
              </div>
              <div className="flex-grow">
                  <h4 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{vendorData?.shopName || listing.vendorName}</h4>
                  <p className="text-xs text-gray-500 mb-1">Member since {vendorData?.memberSince || '2024'}</p>
                  <div className="flex items-center gap-2">
                      <div className="flex items-center text-yellow-500 text-xs font-bold">{vendorStats.rating.toFixed(1)} <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg></div>
                  </div>
              </div>
          </div>
      </SectionWrapper>

      <SectionWrapper className="bg-gray-50 dark:bg-gray-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => handleActionClick('call')} className="flex items-center justify-center gap-3 py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  Call Seller
              </button>
              <button onClick={() => { if (!user) { alert("Please login to chat."); return; } handleActionClick('msg'); onNavigate('chats', { targetUser: { id: listing.vendorId, name: vendorData?.shopName || listing.vendorName } }); }} className="flex items-center justify-center gap-3 py-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white rounded-xl font-bold shadow-md hover:bg-gray-50 active:scale-95 transition-all">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  Message
              </button>
              <button onClick={() => handleActionClick('wa')} className="flex items-center justify-center gap-3 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-38.1-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.7z"/></svg>
                  WhatsApp
              </button>
          </div>
      </SectionWrapper>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-800 p-4 md:hidden z-50 flex gap-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <button onClick={() => { if (!user) { alert("Please login to chat."); return; } handleActionClick('msg'); onNavigate('chats', { targetUser: { id: listing.vendorId, name: vendorData?.shopName || listing.vendorName } }); }} className="flex-1 py-3.5 bg-white dark:bg-gray-800 border-2 border-primary text-primary font-black rounded-xl text-sm">CHAT</button>
          <button onClick={() => handleActionClick('call')} className="flex-1 py-3.5 bg-primary text-white font-black rounded-xl text-sm text-center shadow-lg shadow-primary/30">CALL</button>
      </div>

      {contactPopup?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setContactPopup(null)}>
              <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform animate-pop-in" onClick={e => e.stopPropagation()}>
                  <div className={`p-6 text-center ${contactPopup.type === 'whatsapp' ? 'bg-green-600' : 'bg-primary'} text-white`}>
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/30">
                          {contactPopup.type === 'call' ? (
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                          ) : (
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-38.1-3.2-5.6-.3-8.6 2.5-11.4 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.5 5.5-9.3 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.5 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.7z"/></svg>
                          )}
                      </div>
                      <h4 className="text-lg font-bold">{contactPopup.type === 'call' ? 'Call Seller' : 'WhatsApp Us'}</h4>
                  </div>
                  <div className="p-6 text-center bg-white dark:bg-dark-surface">
                      <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-widest mb-2">Seller's Number</p>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 select-all">{contactPopup.number}</h2>
                      <div className="space-y-3">
                          <a href={contactPopup.type === 'call' ? `tel:${contactPopup.number}` : `https://wa.me/${contactPopup.number.replace(/[^0-9]/g, '')}?text=Hi, I am interested in your ad: ${listing.title}`} target="_blank" rel="noreferrer" className={`block w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${contactPopup.type === 'whatsapp' ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary-dark'}`}>{contactPopup.type === 'call' ? 'Call Now' : 'Send Message'}</a>
                          <button onClick={() => { navigator.clipboard.writeText(contactPopup.number); alert("Number copied!"); }} className="block w-full py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">Copy Number</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ListingDetailsPage;
