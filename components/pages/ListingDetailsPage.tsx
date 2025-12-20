
import React, { useState, useEffect } from 'react';
import { Listing, User, Review } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, getDoc, getDocs, query, collection, where, setDoc } from 'firebase/firestore';
import ListingCard from '../common/ListingCard';

interface ListingDetailsPageProps {
  listing: Listing;
  listings: Listing[]; // Added for Related Listings
  user: User | null;
  onNavigate: (view: 'listings' | 'details' | 'chats' | 'vendor-profile', payload?: { listing?: Listing, targetUser?: { id: string, name: string }, targetVendorId?: string }) => void;
}

const ListingDetailsPage: React.FC<ListingDetailsPageProps> = ({ listing, listings, user, onNavigate }) => {
    const [reviews, setReviews] = useState<Review[]>(listing.reviews || []);
    const [newRating, setNewRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    
    // Vendor Data State
    const [vendorData, setVendorData] = useState<User | null>(null);
    const [vendorStats, setVendorStats] = useState({ rating: 0, reviewCount: 0 });

    const [helpfulState, setHelpfulState] = useState<Record<string, 'helpful' | 'not-helpful'>>({});

    // Image Gallery State
    const images = listing.images && listing.images.length > 0 ? listing.images : [listing.imageUrl];
    const [activeImage, setActiveImage] = useState(images[0]);

    // Favorites State
    const [isFavorite, setIsFavorite] = useState(false);
    
    // Calculate Related Listings
    const relatedListings = listings
        .filter(l => l.category === listing.category && l.id !== listing.id)
        .slice(0, 4);

    useEffect(() => {
        setReviews(listing.reviews || []);
        // Reset active image when listing changes
        const currentImages = listing.images && listing.images.length > 0 ? listing.images : [listing.imageUrl];
        setActiveImage(currentImages[0]);
    }, [listing.reviews, listing.id]); // Added listing.id to dep array

    useEffect(() => {
        if (user && user.favorites) {
            setIsFavorite(user.favorites.includes(listing.id));
        }
    }, [user, listing.id]);

    useEffect(() => {
        if (db) {
            const listingRef = doc(db, 'listings', listing.id);
            updateDoc(listingRef, { views: increment(1) }).catch(() => {});
        }
    }, [listing.id]);

    useEffect(() => {
        const fetchVendorInfo = async () => {
            if (!db || !listing.vendorId) return;
            try {
                const userSnap = await getDoc(doc(db, "users", listing.vendorId));
                if (userSnap.exists()) {
                    setVendorData(userSnap.data() as User);
                }
                const q = query(collection(db, "listings"), where("vendorId", "==", listing.vendorId));
                const querySnapshot = await getDocs(q);
                let totalRating = 0;
                let count = 0;
                querySnapshot.forEach((doc) => {
                    const l = doc.data();
                    if (l.rating > 0) {
                        totalRating += l.rating;
                        count++;
                    }
                });
                setVendorStats({
                    rating: count > 0 ? totalRating / count : 0,
                    reviewCount: count
                });
            } catch (e) {
                console.error("Error fetching vendor details", e);
            }
        };
        fetchVendorInfo();
    }, [listing.vendorId]);

    const handleToggleFavorite = async () => {
        if (!user) {
            alert("Please login to save favorites.");
            return;
        }
        const wasFavorite = isFavorite;
        setIsFavorite(!wasFavorite);

        try {
            const demoFavs = JSON.parse(localStorage.getItem('demo_user_favorites') || '{}');
            let userFavs = demoFavs[user.id] || (user.favorites ? [...user.favorites] : []);
            if (wasFavorite) {
                userFavs = userFavs.filter((id: string) => id !== listing.id);
            } else {
                if (!userFavs.includes(listing.id)) userFavs.push(listing.id);
            }
            demoFavs[user.id] = userFavs;
            localStorage.setItem('demo_user_favorites', JSON.stringify(demoFavs));
            window.dispatchEvent(new Event('favorites_updated'));
        } catch (e) {}

        if (!db) return;
        const userRef = doc(db, 'users', user.id);
        const listingRef = doc(db, 'listings', listing.id);
        try {
            // FIX: Use setDoc with merge instead of updateDoc to prevent "No document to update" error
            if (wasFavorite) {
                await setDoc(userRef, { favorites: arrayRemove(listing.id) }, { merge: true });
                await updateDoc(listingRef, { likes: increment(-1) }).catch(() => {});
            } else {
                await setDoc(userRef, { favorites: arrayUnion(listing.id) }, { merge: true });
                await updateDoc(listingRef, { likes: increment(1) }).catch(() => {});
            }
        } catch (e: any) {
            console.warn("Favorite sync failed: " + e.message);
        }
    };

    const handleCallClick = () => {
        if (db) {
            const listingRef = doc(db, 'listings', listing.id);
            updateDoc(listingRef, { calls: increment(1) }).catch(() => {});
        }
    };

    const handleShare = async () => {
        const shareData = {
            title: listing.title,
            text: `Check out ${listing.title} on RizqDaan!`,
            url: window.location.href
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
            }
        } catch (err) {}
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newRating === 0 || !newComment.trim() || !user) return;
        
        setIsSubmittingReview(true);
        const newReview: Review = {
            id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            author: user.name,
            rating: newRating,
            comment: newComment.trim(),
            date: new Date().toISOString().split('T')[0]
        };
        
        setReviews([newReview, ...reviews]);
        setNewRating(0);
        setNewComment('');
        setIsReviewFormOpen(false);

        if(db) {
            try {
                const listingRef = doc(db, 'listings', listing.id);
                await updateDoc(listingRef, { reviews: arrayUnion(newReview) });
            } catch(e) {
                alert("Review submitted locally (Demo Mode).");
            }
        }
        setIsSubmittingReview(false);
    };

    const discountPercent = listing.originalPrice 
        ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
        : 0;

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const star = Math.round(r.rating) as keyof typeof starCounts;
        if (star >= 1 && star <= 5) starCounts[star]++;
    });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;

    const sortedReviews = [...reviews].sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
        if (sortBy === 'highest') return b.rating - a.rating;
        if (sortBy === 'lowest') return a.rating - b.rating;
        return 0;
    });

  return (
    <div className="bg-gray-50 dark:bg-black min-h-screen pb-24 md:pb-10">
      
      {/* Breadcrumbs - Ultra Compact */}
      <div className="container mx-auto px-4 py-2 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 mb-2">
          <span className="cursor-pointer hover:text-primary" onClick={() => onNavigate('listings')}>Home</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="cursor-pointer hover:text-primary">{listing.category}</span>
          <span className="mx-2 text-gray-300">/</span>
          <span className="text-gray-800 dark:text-gray-200 font-medium truncate">{listing.title}</span>
      </div>

      <div className="container mx-auto px-0 md:px-4 max-w-6xl">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4">
            
            {/* 1. IMAGES (Col-span-2 on Desktop, Top on Mobile) */}
            <div className="lg:col-span-2 order-1">
                <div className="bg-white dark:bg-dark-surface rounded-none md:rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                        <img src={activeImage} alt={listing.title} className="max-h-full max-w-full object-contain" />
                        {/* Badges Overlay */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                             {listing.isPromoted && <span className="bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">FEATURED</span>}
                             {discountPercent > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">-{discountPercent}%</span>}
                        </div>
                    </div>
                    {/* Thumbnails Row */}
                    {images.length > 1 && (
                        <div className="flex gap-2 p-2 overflow-x-auto bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-700 scrollbar-hide">
                            {images.map((img, index) => (
                                <button 
                                    key={index} 
                                    onMouseEnter={() => setActiveImage(img)}
                                    onClick={() => setActiveImage(img)} 
                                    className={`relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${activeImage === img ? 'border-primary' : 'border-transparent hover:border-gray-300'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`Thumb ${index}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. PRICE & INFO (Right Col Desktop, BELOW Image Mobile) */}
            <div className="lg:col-span-1 order-2 lg:row-span-2 h-fit space-y-3">
                
                {/* Main Info Card */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-none md:rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-primary dark:text-white leading-none">
                                Rs. {(listing.price || 0).toLocaleString()}
                            </h2>
                            {listing.originalPrice && <span className="text-xs text-gray-400 line-through mt-1 block">Rs. {listing.originalPrice.toLocaleString()}</span>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleShare} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-primary transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            </button>
                            <button onClick={handleToggleFavorite} className={`p-2 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors ${isFavorite ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                        </div>
                    </div>

                    <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-3 line-clamp-2">
                        {listing.title}
                    </h1>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="truncate max-w-[150px]">{listing.location}</span>
                        </div>
                        <span>{new Date(listing.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Seller Card */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-none md:rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Sold By</h4>
                    <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => onNavigate('vendor-profile', { targetVendorId: listing.vendorId })}>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden border border-primary/20">
                            {vendorData?.profilePictureUrl ? (
                                <img src={vendorData.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-primary font-bold text-xl">{(vendorData?.shopName || listing.vendorName).charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-gray-900 dark:text-white hover:text-primary transition-colors text-sm truncate">
                                {vendorData?.shopName || listing.vendorName}
                            </h5>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                <div className="flex items-center text-yellow-500 font-bold">
                                    <span>{vendorStats.rating.toFixed(1)}</span>
                                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg>
                                </div>
                                <span className="text-[10px]">({vendorStats.reviewCount} Ads)</span>
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                    
                    <div className="hidden md:flex flex-col gap-2">
                        <button
                            onClick={() => {
                                if (!user) {
                                    alert("Please login to message.");
                                    return;
                                }
                                onNavigate('chats', { targetUser: { id: listing.vendorId, name: vendorData?.shopName || listing.vendorName } });
                            }}
                            className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            Chat with Seller
                        </button>
                        <a 
                            href={`tel:${listing.contact.phone}`} 
                            onClick={handleCallClick}
                            className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                            Call Now
                        </a>
                    </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-white dark:bg-dark-surface p-4 rounded-none md:rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-3">Safety Tips</h4>
                    <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
                        <li>Meet in a safe public place</li>
                        <li>Check item before buying</li>
                        <li>Don't pay in advance</li>
                    </ul>
                </div>
            </div>

            {/* 3. DESC & REVIEWS (Col-span-2 Desktop, Bottom Mobile) */}
            <div className="lg:col-span-2 order-3 space-y-4">
                {/* Description Card */}
                <div className="bg-white dark:bg-dark-surface rounded-none md:rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">Description</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {listing.description}
                    </p>
                </div>

                {/* Ratings & Reviews */}
                <div id="reviews" className="bg-white dark:bg-dark-surface rounded-none md:rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Reviews ({totalReviews})</h3>
                        {user ? (
                            <button onClick={() => setIsReviewFormOpen(!isReviewFormOpen)} className="text-xs font-bold text-primary hover:underline">
                                {isReviewFormOpen ? 'Cancel' : 'Write Review'}
                            </button>
                        ) : (
                            <span className="text-xs text-gray-400">Login to review</span>
                        )}
                    </div>
                    
                    {/* Summary Row */}
                    <div className="flex items-center gap-4 mb-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-center min-w-[60px]">
                            <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{averageRating.toFixed(1)}</div>
                            <div className="text-[10px] text-gray-500 uppercase mt-1">out of 5</div>
                        </div>
                        <div className="flex-1 border-l border-gray-200 dark:border-gray-700 pl-4">
                            <div className="space-y-1">
                                {[5, 4, 3, 2, 1].map(star => {
                                    const count = starCounts[star as keyof typeof starCounts];
                                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-2 text-[10px]">
                                            <span className="w-2 text-gray-400">{star}</span>
                                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Review Form */}
                    {isReviewFormOpen && user && (
                        <form onSubmit={handleReviewSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg animate-fade-in">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Rate:</span>
                                <div className="flex">
                                    {[...Array(5)].map((_, index) => (
                                        <button type="button" key={index} onClick={() => setNewRating(index + 1)} onMouseEnter={() => setHoverRating(index + 1)} onMouseLeave={() => setHoverRating(0)} className="p-0.5 focus:outline-none">
                                            <svg className={`w-5 h-5 ${index + 1 <= (hoverRating || newRating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" /></svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} className="w-full p-2 border rounded-lg text-sm mb-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-1 focus:ring-primary" rows={3} placeholder="Write your review..."></textarea>
                            <button type="submit" disabled={newRating === 0 || !newComment.trim() || isSubmittingReview} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded shadow-sm hover:bg-primary-dark disabled:opacity-50">Post Review</button>
                        </form>
                    )}

                    {/* Review List */}
                    <div className="space-y-4">
                        {sortedReviews.length > 0 ? (
                            sortedReviews.map(review => (
                                <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-[10px] text-gray-600 dark:text-gray-300">
                                                {review.author.charAt(0)}
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{review.author}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{review.date}</span>
                                    </div>
                                    <div className="flex text-yellow-400 text-[10px] mb-1 pl-8">
                                        {[...Array(5)].map((_, i) => <span key={i}>{i < review.rating ? '★' : '☆'}</span>)}
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 pl-8 leading-snug">{review.comment}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-gray-400 text-xs">No reviews yet.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. RELATED LISTINGS (Full Width at Bottom) */}
            {relatedListings.length > 0 && (
                <div className="lg:col-span-3 order-4 mt-4 px-4 md:px-0">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm uppercase tracking-wide">Similar Ads</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {relatedListings.map(l => (
                            <ListingCard 
                                key={l.id} 
                                listing={l} 
                                onViewDetails={(item) => onNavigate('details', { listing: item })} 
                            />
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* STICKY BOTTOM ACTIONS (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-700 px-4 py-3 md:hidden z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom,20px)]">
          <div className="flex gap-3">
              <button
                onClick={() => {
                    if (!user) {
                        alert("Please login to send messages.");
                        return;
                    }
                    onNavigate('chats', { targetUser: { id: listing.vendorId, name: vendorData?.shopName || listing.vendorName } });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-md transition-transform active:scale-95"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  Chat
              </button>
              <a 
                href={`tel:${listing.contact.phone}`} 
                onClick={handleCallClick}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95"
              >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  Call
              </a>
          </div>
      </div>

    </div>
  );
};

export default ListingDetailsPage;
