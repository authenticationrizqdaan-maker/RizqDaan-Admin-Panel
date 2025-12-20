
import React from 'react';
import { Listing } from '../../types';

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onViewDetails }) => {
  const StarRating = ({ rating, reviewsCount }: { rating: number, reviewsCount: number }) => {
    return (
      <div className="flex items-center gap-1">
        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
        <span className="text-[10px] text-gray-400">({reviewsCount})</span>
      </div>
    );
  };

  const discountPercent = listing.originalPrice 
    ? Math.round(((listing.originalPrice - listing.price) / listing.originalPrice) * 100)
    : 0;

  return (
    <div 
      className={`group bg-white dark:bg-dark-surface rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative ${listing.isPromoted ? 'ring-1 ring-accent-yellow/50' : ''}`}
      onClick={() => onViewDetails(listing)}
    >
      {/* Image Container with Fixed Aspect Ratio */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
        <img 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          src={listing.imageUrl} 
          alt={listing.title} 
          loading="lazy" 
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
            {listing.isPromoted && (
                <span className="bg-accent-yellow text-primary text-[9px] font-extrabold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase tracking-tighter">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.446a1 1 0 00-1.175 0l-3.367 2.446c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z"/></svg>
                    Featured
                </span>
            )}
            {discountPercent > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm w-fit">
                    -{discountPercent}%
                </span>
            )}
        </div>

        {/* Type Badge (Bottom Left) */}
        <div className="absolute bottom-2 left-2">
             <span className="bg-black/40 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-medium uppercase tracking-widest">
                {listing.category.split(' ')[0]}
             </span>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="p-3 flex flex-col flex-grow">
        {/* Price Row */}
        <div className="flex items-center justify-between mb-1">
            <p className="text-base font-bold text-primary dark:text-white">Rs. {listing.price.toLocaleString()}</p>
            <button className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
        </div>

        {/* Original Price (if any) */}
        {listing.originalPrice && (
            <p className="text-[10px] text-gray-400 line-through -mt-1 mb-1">Rs. {listing.originalPrice.toLocaleString()}</p>
        )}

        {/* Title - Fixed height with line clamp for alignment */}
        <h3 className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight line-clamp-2 mb-3 min-h-[2.5rem]">
            {listing.title}
        </h3>
        
        {/* Footer info */}
        <div className="mt-auto border-t border-gray-50 dark:border-gray-800 pt-2 flex items-center justify-between">
            <StarRating rating={listing.rating} reviewsCount={listing.reviews?.length || 0} />
            <div className="flex items-center text-[10px] text-gray-400 gap-0.5 max-w-[50%]">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="truncate">{listing.location.split(',')[0]}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
