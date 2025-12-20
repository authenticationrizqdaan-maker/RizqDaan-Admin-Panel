
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
  price: number; // This is now the discounted/current price
  originalPrice?: number;
  itemsSold: number;
  hasFreeDelivery: boolean;
  imageUrl: string;
  images?: string[]; // Array of image URLs for gallery
  vendorId: string;
  vendorName: string;
  location: string;
  latitude?: number; // GPS Latitude
  longitude?: number; // GPS Longitude
  rating: number;
  reviews: Review[];
  contact: {
    phone: string;
    whatsapp: string;
  };
  createdAt?: string;
  // New Analytics Fields
  views?: number;
  calls?: number; // Added calls tracking
  messages?: number; // Added messages tracking
  likes?: number;
  isPromoted?: boolean;
  // Expanded Status for Admin Moderation
  status?: 'active' | 'draft' | 'pending' | 'rejected' | 'sold' | 'expired';
}

export interface SubCategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: ReactElement | string; // Changed to allow string for stored icons
  subcategories: SubCategory[];
}

export interface Vendor {
  id: string;
  name: string;
  profilePictureUrl: string;
  memberSince: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'bonus' | 'penalty' | 'fee' | 'commission' | 'promotion' | 'referral_bonus';
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
  userId?: string; // Optional linkage for global ledger
  userName?: string;
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
    method: string; // 'JazzCash' | 'EasyPaisa' | 'Bank'
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
    customNote?: string; // New field for admin custom messages
}

export interface ReferralSettings {
    inviterBonus: number; // Amount given to person who invited
    inviteeBonus: number; // Amount given to new user
    badgeThreshold: number; // Number of invites needed for Star Badge
    isActive: boolean;
}

// Old simple request (can be deprecated or kept for legacy)
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

// NEW: Advanced Campaign Interface
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
    targetLocation: string; // e.g., 'All Pakistan' or 'Lahore'
    priority?: 'high' | 'normal'; // New: Admin control for placement
    
    // Live Analytics
    impressions: number;
    clicks: number;
    ctr: number; // Click Through Rate
    cpc: number; // Cost Per Click
    conversions?: number; // New metric for advanced tracking
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    isRead: boolean;
    createdAt: string; // ISO String
    link?: string; // e.g., 'wallet-history'
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
  isBanned?: boolean; // New: For banning users
  isAdmin?: boolean;
  profilePictureUrl?: string;
  // New Profile Fields
  coverPictureUrl?: string;
  bio?: string;
  followers?: string[]; // Array of User IDs who follow this vendor
  favorites?: string[]; // Array of Listing IDs
  savedSearches?: string[]; // Array of strings
  
  // Referral System
  referralCode?: string; // Their unique code (e.g. ALI-123)
  referredBy?: string | null; // The ID of the user who invited them. Nullable to avoid undefined errors in Firestore.
  referralStats?: {
      totalInvited: number;
      totalEarned: number;
  };

  // Admin CRM
  adminNotes?: string; // Private notes for admin

  // Wallet & Finance Fields
  wallet?: {
    balance: number;
    totalSpend: number;
    pendingDeposit: number;
    pendingWithdrawal: number;
  };
  walletHistory?: Transaction[]; // History of transactions
  
  // Settings
  notifications?: {
      push: boolean;
      email: boolean;
      sms: boolean;
  };
}

// --- CHAT TYPES ---
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any; // Firestore Timestamp or Date
  read: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTimestamp: any;
  participantNames: Record<string, string>; // { uid: "Name" }
  participantPics?: Record<string, string>; // { uid: "url" }
  unreadCounts: Record<string, number>;
}
