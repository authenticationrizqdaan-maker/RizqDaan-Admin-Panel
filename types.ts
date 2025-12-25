
import type { ReactElement } from 'react';

export enum ListingType {
  Business = 'Business',
  Product = 'Product',
  Service = 'Service',
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Listing {
  id:string;
  title: string;
  description: string;
  type: ListingType;
  category: string;
  price: number; 
  originalPrice?: number;
  itemsSold: number;
  hasFreeDelivery: boolean;
  imageUrl: string;
  images?: string[]; 
  vendorId: string;
  vendorName: string;
  location: string;
  latitude?: number; 
  longitude?: number; 
  rating: number;
  reviews: Review[];
  contact: {
    phone: string;
    whatsapp: string;
  };
  createdAt?: string;
  views?: number;
  calls?: number; 
  messages?: number; 
  likes?: number;
  isPromoted?: boolean;
  status?: 'active' | 'draft' | 'pending' | 'rejected' | 'sold' | 'expired';
}

export interface HomeBanner {
    id: string;
    title: string;
    subtitle: string;
    color: string; 
    icon: string; 
    imageUrl?: string; 
    link?: string; 
    isActive: boolean;
    order: number;
}

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Strictly string key to prevent circular reference errors
  subcategories: SubCategory[];
}

export interface Vendor {
  id: string;
  name: string;
  profilePictureUrl: string;
  memberSince: string;
}

// HELP CENTER TYPES
export interface HelpCategory {
    id: string;
    title: string;
    icon: string; 
    order: number;
    isActive: boolean;
}

export interface HelpTopic {
    id: string;
    categoryId: string;
    title: string;
    content: string;
    order: number;
    isActive: boolean;
}

// GLOBAL APP SETTINGS
export interface AppSettings {
    supportWhatsapp: string;
    supportEmail: string;
    maintenanceMode: boolean;
    appName: string;
    facebookUrl: string;
    instagramUrl: string;
    maintenanceMessage?: string;
}

// SHARED NAVIGATION TYPES
export type AppView = 'home' | 'listings' | 'details' | 'vendor-dashboard' | 'auth' | 'account' | 'subcategories' | 'chats' | 'add-listing' | 'my-ads' | 'vendor-analytics' | 'favorites' | 'saved-searches' | 'edit-profile' | 'settings' | 'admin' | 'vendor-profile' | 'promote-business' | 'add-balance' | 'referrals' | 'wallet-history' | 'notifications' | 'help-center';

export interface NavigatePayload {
  listing?: Listing;
  category?: Category;
  query?: string;
  targetUser?: { id: string; name: string };
  targetVendorId?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: 'EasyPaisa' | 'JazzCash' | 'Bank Transfer';
  accountDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  processedDate?: string;
  adminNote?: string;
}

export interface DepositRequest {
    id: string;
    userId: string;
    userName: string;
    amount: number;
    method: string; 
    transactionId: string;
    senderPhone: string;
    screenshotUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    date: string;
    adminNote?: string;
}

export interface PaymentInfo {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    instructions?: string;
    customNote?: string; 
}

export interface PromotionRequest {
    id: string;
    vendorId: string;
    vendorName: string;
    shopName: string;
    service: string;
    priceString: string;
    contact?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    approvedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone: string;
  shopName: string;
  shopAddress: string;
  googleId?: string;
  isVerified: boolean;
  isBanned?: boolean; 
  isAdmin?: boolean;
  profilePictureUrl?: string;
  coverPictureUrl?: string;
  bio?: string;
  followers?: string[]; 
  favorites?: string[]; 
  savedSearches?: string[]; 
  referralCode?: string; 
  referredBy?: string | null; 
  referralStats?: {
      totalInvited: number;
      totalEarned: number;
  };
  // FIX: Added memberSince property to User interface
  memberSince?: string;
  adminNotes?: string; 
  wallet?: {
    balance: number;
    totalSpend: number;
    pendingDeposit: number;
    pendingWithdrawal: number;
  };
  walletHistory?: Transaction[]; 
  notifications?: {
      push: boolean;
      email: boolean;
      sms: boolean;
  };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any; 
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: any;
  participantNames: Record<string, string>; 
  participantPics?: Record<string, string>; 
  unreadCounts: Record<string, number>;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'bonus' | 'penalty' | 'fee' | 'commission' | 'promotion' | 'referral_bonus';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  userId?: string; 
  userName?: string;
}

export interface ReferralSettings {
    inviterBonus: number; 
    inviteeBonus: number; 
    badgeThreshold: number; 
    isActive: boolean;
}

export interface AdCampaign {
    id: string;
    vendorId: string;
    listingId: string;
    listingTitle: string;
    listingImage: string;
    type: 'featured_listing' | 'banner_ad' | 'social_boost';
    goal: 'traffic' | 'calls' | 'awareness';
    status: 'active' | 'paused' | 'completed' | 'pending_approval' | 'rejected';
    startDate: string;
    endDate: string;
    durationDays: number;
    totalCost: number;
    targetLocation: string; 
    priority?: 'high' | 'normal';
    impressions: number;
    clicks: number;
    ctr: number; 
    cpc: number; 
    conversions?: number; 
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: string; 
    link?: string; 
}
