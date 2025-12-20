
import React, { useState, useEffect, useCallback } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, onSnapshot, Unsubscribe, query, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';

import Header from './components/common/Header';
import BottomNavBar from './components/common/BottomNavBar';
import HomePage from './components/pages/HomePage';
import ListingsPage from './components/pages/ListingsPage';
import ListingDetailsPage from './components/pages/ListingDetailsPage';
import VendorDashboard from './components/pages/VendorDashboard';
import VendorProfilePage from './components/pages/VendorProfilePage';
import AuthPage from './components/auth/AuthPage';
import AccountPage from './components/auth/AccountPage';
import SubCategoryPage from './components/pages/SubCategoryPage';
import FavoritesPage from './components/pages/FavoritesPage';
import SavedSearchesPage from './components/pages/SavedSearchesPage';
import EditProfilePage from './components/auth/EditProfilePage';
import SettingsPage from './components/pages/SettingsPage';
import ReferralPage from './components/pages/ReferralPage';
import ChatPage from './components/pages/ChatPage';
import AddFundsPage from './components/pages/AddFundsPage';
import WalletHistoryPage from './components/pages/WalletHistoryPage';
import NotificationsPage from './components/pages/NotificationsPage'; 
import { Listing, User, Category } from './types';
import { CATEGORIES as DEFAULT_CATEGORIES } from './constants';

type View = 'home' | 'listings' | 'details' | 'vendor-dashboard' | 'auth' | 'account' | 'subcategories' | 'chats' | 'add-listing' | 'my-ads' | 'vendor-analytics' | 'favorites' | 'saved-searches' | 'edit-profile' | 'settings' | 'vendor-profile' | 'promote-business' | 'add-balance' | 'referrals' | 'wallet-history' | 'notifications';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [listingsDB, setListingsDB] = useState<Listing[]>([]);
  const [lastListingDoc, setLastListingDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [chatTargetUser, setChatTargetUser] = useState<{id: string, name: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialVendorTab, setInitialVendorTab] = useState<'dashboard' | 'my-listings' | 'add-listing' | 'promotions'>('dashboard');

  useEffect(() => {
    if (!auth) return;
    let userUnsubscribe: Unsubscribe | null = null;
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        userUnsubscribe = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) setUser({ id: firebaseUser.uid, ...docSnap.data() } as User);
        });
      } else {
        setUser(null);
      }
    });
    return () => { authUnsubscribe(); if (userUnsubscribe) userUnsubscribe(); };
  }, []);

  useEffect(() => {
      if (!db) return;
      const q = query(collection(db, "listings"), orderBy("createdAt", "desc"), limit(20));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
          setListingsDB(items);
          setLastListingDoc(snapshot.docs[snapshot.docs.length - 1] || null);
          setHasMoreListings(snapshot.docs.length >= 20);
      });
      return () => unsubscribe();
  }, []);

  const handleNavigate = useCallback((newView: View, payload?: any) => {
    if (payload?.listing) setSelectedListing(payload.listing);
    if (payload?.category) setSelectedCategory(payload.category);
    if (payload?.query !== undefined) setSearchQuery(payload.query);
    if (payload?.targetUser) setChatTargetUser(payload.targetUser);
    if (payload?.targetVendorId) setSelectedVendorId(payload.targetVendorId);
    
    if (['chats', 'account', 'favorites', 'add-listing', 'vendor-dashboard'].includes(newView) && !user) {
        setView('auth');
    } else {
        setView(newView);
    }
    window.scrollTo(0, 0);
  }, [user]);

  return (
    <div className="min-h-screen bg-primary-light dark:bg-dark-bg font-poppins antialiased">
      <Header onNavigate={(v) => handleNavigate(v as View)} toggleTheme={() => {}} currentTheme="light" user={user} />
      <main className="container mx-auto px-4 py-6 pb-24">
        {view === 'home' && <HomePage listings={listingsDB} onNavigate={handleNavigate} onSaveSearch={() => {}} />}
        {view === 'listings' && <ListingsPage listings={listingsDB} onNavigate={(v, p) => handleNavigate(v as View, p)} initialSearchTerm={searchQuery} />}
        {view === 'details' && selectedListing && <ListingDetailsPage listing={selectedListing} listings={listingsDB} user={user} onNavigate={handleNavigate} />}
        {view === 'vendor-dashboard' && <VendorDashboard initialTab={initialVendorTab} listings={listingsDB} user={user} onNavigate={handleNavigate} />}
        {view === 'auth' && <AuthPage onLogin={async () => ({success: true, message: ''})} onSignup={async () => ({success: true, message: ''})} onVerifyAndLogin={() => {}} />}
        {view === 'account' && user && <AccountPage user={user} listings={listingsDB} onLogout={() => signOut(auth)} onNavigate={handleNavigate} />}
        {view === 'chats' && user && <ChatPage currentUser={user} targetUser={chatTargetUser} onNavigate={() => setView('home')} />}
        {view === 'notifications' && user && <NotificationsPage user={user} onNavigate={handleNavigate} />}
        {view === 'favorites' && user && <FavoritesPage user={user} listings={listingsDB} onNavigate={handleNavigate} />}
        {view === 'referrals' && user && <ReferralPage user={user} onNavigate={() => setView('account')} />}
        {view === 'add-balance' && user && <AddFundsPage user={user} onNavigate={() => setView('account')} />}
        {view === 'wallet-history' && user && <WalletHistoryPage user={user} onNavigate={() => setView('account')} />}
        {view === 'vendor-profile' && selectedVendorId && <VendorProfilePage vendorId={selectedVendorId} currentUser={user} listings={listingsDB} onNavigate={handleNavigate} />}
        {view === 'settings' && user && <SettingsPage user={user} onNavigate={() => setView('account')} currentTheme="light" toggleTheme={() => {}} onLogout={() => signOut(auth)} />}
        {view === 'edit-profile' && user && <EditProfilePage user={user} onNavigate={handleNavigate} />}
      </main>
      <BottomNavBar onNavigate={(v) => handleNavigate(v as View)} activeView={view} />
    </div>
  );
};

export default App;
