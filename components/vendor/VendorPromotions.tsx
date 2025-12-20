
import React, { useState, useEffect } from 'react';
import { User, Listing, AdCampaign, Transaction } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, writeBatch } from 'firebase/firestore';
import { PAKISTAN_LOCATIONS } from '../../constants';

interface VendorPromotionsProps {
  user: User | null;
  initialListingId?: string;
  onNavigate?: (view: 'add-balance') => void;
}

const VendorPromotions: React.FC<VendorPromotionsProps> = ({ user, initialListingId, onNavigate }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'create' | 'history'>('dashboard');
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local Override State for Immediate UI Updates (Demo Mode Support)
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<AdCampaign>>>({});

  // Ad Rates State
  const [adRates, setAdRates] = useState({
      featured_listing: 100,
      banner_ad: 500,
      social_boost: 300
  });

  // Handle deep linking from Manage Listings
  useEffect(() => {
      if (initialListingId) {
          setActiveView('create');
      }
  }, [initialListingId]);

  // --- DATA FETCHING ---
  useEffect(() => {
      if (!user) return;

      if (!db) {
          // Mock Data Handling if DB is not available
          setLoading(false);
          return;
      }

      // 1. Fetch Vendor's Listings
      const qListings = query(collection(db, 'listings'), where('vendorId', '==', user.id));
      const unsubListings = onSnapshot(qListings, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
          setListings(data.filter(l => l.status === 'active'));
      }, (error) => {
          console.warn("Listings snapshot error: " + error.message);
      });

      // 2. Fetch Campaigns
      const qCampaigns = query(collection(db, 'campaigns'), where('vendorId', '==', user.id));
      const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdCampaign));
          setCampaigns(data);
          setLoading(false);
      }, (error) => {
          console.warn("Campaigns snapshot error: " + error.message);
          setLoading(false);
      });

      // 3. Fetch Dynamic Rates & Sync Local Overrides
      const loadLocalData = () => {
          const localRates = localStorage.getItem('ad_pricing');
          if (localRates) {
              try { setAdRates(JSON.parse(localRates)); } catch(e){}
          }
          
          const savedOverrides = localStorage.getItem('admin_campaign_overrides');
          if (savedOverrides) {
              try { setLocalOverrides(JSON.parse(savedOverrides)); } catch(e){}
          }
      };
      
      loadLocalData();
      
      // Listen for updates from other tabs/components
      window.addEventListener('campaigns_updated', loadLocalData);
      window.addEventListener('ad_pricing_updated', loadLocalData);

      return () => {
          unsubListings();
          unsubCampaigns();
          window.removeEventListener('campaigns_updated', loadLocalData);
          window.removeEventListener('ad_pricing_updated', loadLocalData);
      };
  }, [user]);

  // Apply local overrides to campaigns
  const displayCampaigns = campaigns.map(c => localOverrides[c.id] ? { ...c, ...localOverrides[c.id] } : c);

  return (
    <div className="animate-fade-in min-h-[600px]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                🚀 Ads Manager
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">PRO</span>
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create, manage, and track your business promotions.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <button 
                onClick={() => setActiveView('dashboard')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeView === 'dashboard' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveView('create')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeView === 'create' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
                + New Campaign
            </button>
            <button 
                onClick={() => setActiveView('history')}
                className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeView === 'history' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
                History
            </button>
        </div>
      </div>

      {/* CONTENT */}
      {activeView === 'dashboard' && (
          <DashboardView 
            campaigns={displayCampaigns} 
            user={user} 
            onCreateClick={() => setActiveView('create')} 
            onAddFundsClick={() => onNavigate && onNavigate('add-balance')}
          />
      )}
      {activeView === 'create' && (
          <CreateCampaignWizard 
            user={user} 
            listings={listings} 
            adRates={adRates} 
            onCancel={() => setActiveView('dashboard')} 
            onSuccess={() => setActiveView('dashboard')} 
            initialListingId={initialListingId}
          />
      )}
      {activeView === 'history' && <HistoryView campaigns={displayCampaigns} />}

    </div>
  );
};

const DashboardView = ({ campaigns, user, onCreateClick, onAddFundsClick }: { campaigns: AdCampaign[], user: User | null, onCreateClick: () => void, onAddFundsClick: () => void }) => {
    // Show active, paused, and pending approval
    const activeCampaigns = campaigns.filter(c => ['active', 'pending_approval', 'paused'].includes(c.status));
    
    const totalSpent = campaigns.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const totalImpressions = campaigns.reduce((acc, curr) => acc + (curr.impressions || 0), 0);
    const totalClicks = campaigns.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
    const totalConversions = campaigns.reduce((acc, curr) => acc + (curr.conversions || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    // --- ACTIONS ---

    const applyLocalUpdate = (campaignId: string, updates: any, listingId?: string, isPromoted?: boolean) => {
        // 1. Update Campaign Override
        const overrides = JSON.parse(localStorage.getItem('admin_campaign_overrides') || '{}');
        overrides[campaignId] = updates;
        localStorage.setItem('admin_campaign_overrides', JSON.stringify(overrides));

        // 2. Update Listing Override if needed
        if (listingId && isPromoted !== undefined) {
            const listOverrides = JSON.parse(localStorage.getItem('demo_listings_overrides') || '{}');
            listOverrides[listingId] = { isPromoted };
            localStorage.setItem('demo_listings_overrides', JSON.stringify(listOverrides));
            
            // Critical: Notify App.tsx to merge listings again
            window.dispatchEvent(new Event('listings_updated'));
        }
        
        // 3. Notify this component to re-render
        window.dispatchEvent(new Event('campaigns_updated'));
    };

    const handleTogglePause = async (campaign: AdCampaign) => {
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        const isNowPromoted = newStatus === 'active';
        
        // If no DB, go straight to local
        if (!db) {
            applyLocalUpdate(campaign.id, { status: newStatus }, campaign.listingId, isNowPromoted);
            return;
        }
        
        try {
            const batch = writeBatch(db);
            const campRef = doc(db, 'campaigns', campaign.id);
            batch.update(campRef, { status: newStatus });

            if (campaign.listingId) {
                const listRef = doc(db, 'listings', campaign.listingId);
                batch.update(listRef, { isPromoted: isNowPromoted });
            }

            await batch.commit();
        } catch (e: any) {
            console.warn("Pause Toggle Error (Using fallback): " + e.message);
            applyLocalUpdate(campaign.id, { status: newStatus }, campaign.listingId, isNowPromoted);
        }
    };

    const handleDeleteCampaign = async (campaign: AdCampaign) => {
        if (!window.confirm("Are you sure you want to stop and delete this campaign? This will remove the Featured status from your listing.")) return;
        
        const newStatus = 'completed'; // Effectively deleted/archived

        // If no DB, go straight to local
        if (!db) {
            applyLocalUpdate(campaign.id, { status: newStatus }, campaign.listingId, false);
            return;
        }

        try {
            const batch = writeBatch(db);
            
            const campRef = doc(db, 'campaigns', campaign.id);
            batch.update(campRef, { status: newStatus });

            if (campaign.listingId) {
                const listRef = doc(db, 'listings', campaign.listingId);
                batch.update(listRef, { isPromoted: false });
            }

            await batch.commit();
        } catch (e: any) {
            console.warn("Delete Error (Using fallback): " + e.message);
            applyLocalUpdate(campaign.id, { status: newStatus }, campaign.listingId, false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl text-white shadow-lg md:col-span-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Wallet Balance</div>
                    <div className="text-3xl font-bold">Rs. {(user?.wallet?.balance || 0).toLocaleString()}</div>
                    <button 
                        onClick={onAddFundsClick}
                        className="mt-3 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded border border-white/20 transition-colors w-full"
                    >
                        + Add Funds
                    </button>
                </div>
                {/* Stats Cards */}
                <div className="p-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Spent</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">Rs. {totalSpent.toLocaleString()}</div>
                </div>
                <div className="p-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Ad Impressions</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{totalImpressions.toLocaleString()}</div>
                </div>
                <div className="p-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Avg. CTR</div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{avgCTR}%</div>
                </div>
                <div className="p-5 bg-white dark:bg-dark-surface border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Conversions</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalConversions.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Active Campaigns</h3>
                    {activeCampaigns.length === 0 && (
                        <button onClick={onCreateClick} className="text-sm text-primary hover:underline font-medium">Start a Campaign</button>
                    )}
                </div>
                
                {activeCampaigns.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">No Active Ads</h4>
                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Boost your sales by promoting your best listings.</p>
                        <button onClick={onCreateClick} className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-all shadow-md">Launch New Campaign</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Campaign</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Performance</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Schedule</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {activeCampaigns.map(c => {
                                    const end = new Date(c.endDate);
                                    const now = new Date();
                                    const diffTime = end.getTime() - now.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    return (
                                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={c.listingImage} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{c.listingTitle}</div>
                                                        <div className="text-xs text-gray-500 capitalize">{c.type.replace('_', ' ')}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {c.status === 'active' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center w-fit gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Active
                                                    </span>
                                                ) : c.status === 'paused' ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 border border-gray-300">
                                                        Paused
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                                                        In Review
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs space-y-1">
                                                    <div className="flex justify-between w-32"><span>Impr:</span> <span className="font-bold">{c.impressions}</span></div>
                                                    <div className="flex justify-between w-32"><span>Clicks:</span> <span className="font-bold">{c.clicks}</span></div>
                                                    <div className="flex justify-between w-32 text-green-600"><span>Conv:</span> <span className="font-bold">{c.conversions || 0}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                                    <div>Ends: {end.toLocaleDateString()}</div>
                                                    <div className="font-bold mt-0.5">{diffDays > 0 ? `${diffDays} Days Left` : 'Ending Today'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {/* Play/Pause Button - Only if active/paused */}
                                                    {(c.status === 'active' || c.status === 'paused') && (
                                                        <button 
                                                            onClick={() => handleTogglePause(c)}
                                                            className={`p-2 rounded shadow-sm transition-all ${
                                                                c.status === 'active' 
                                                                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200' 
                                                                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                                                            }`}
                                                            title={c.status === 'active' ? "Pause Campaign" : "Resume Campaign"}
                                                        >
                                                            {c.status === 'active' ? (
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                            )}
                                                        </button>
                                                    )}
                                                    
                                                    {/* Delete Button */}
                                                    <button 
                                                        onClick={() => handleDeleteCampaign(c)}
                                                        className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-100 shadow-sm transition-all"
                                                        title="Delete Campaign"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const CreateCampaignWizard = ({ user, listings, adRates, onCancel, onSuccess, initialListingId }: { user: User | null, listings: Listing[], adRates: any, onCancel: () => void, onSuccess: () => void, initialListingId?: string }) => {
    const [step, setStep] = useState(initialListingId ? 2 : 1); 
    const [selectedListingId, setSelectedListingId] = useState<string>(initialListingId || '');
    const [campaignType, setCampaignType] = useState<'featured_listing' | 'banner_ad' | 'social_boost'>('featured_listing');
    const [goal, setGoal] = useState<'traffic' | 'calls' | 'awareness'>('traffic');
    
    // Scheduling State
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [duration, setDuration] = useState(7);

    // Targeting State
    const [locationType, setLocationType] = useState<'broad' | 'specific'>('broad');
    const [selectedProv, setSelectedProv] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    
    const [processing, setProcessing] = useState(false);

    // Recalculate duration when dates change
    useEffect(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        // Ensure minimum 1 day
        setDuration(diffDays > 0 ? diffDays : 1);
    }, [startDate, endDate]);

    // If initialListingId passed, auto-select it.
    useEffect(() => {
        if(initialListingId) {
            setSelectedListingId(initialListingId);
            setStep(2); 
        }
    }, [initialListingId]);

    const selectedListing = listings.find(l => l.id === selectedListingId);

    const getDailyRate = () => {
        switch(campaignType) {
            case 'featured_listing': return adRates.featured_listing || 100;
            case 'banner_ad': return adRates.banner_ad || 500;
            case 'social_boost': return adRates.social_boost || 300;
            default: return 100;
        }
    };
    
    const totalCost = duration * getDailyRate();
    const walletBalance = user?.wallet?.balance || 0;
    const canAfford = walletBalance >= totalCost;

    const handleSubmit = async () => {
        if (!user || !selectedListing || !db) return;
        if (!canAfford) {
            alert("Insufficient funds. Please top up your wallet.");
            return;
        }

        // Date Validation
        if (new Date(endDate) <= new Date(startDate)) {
            alert("End date must be after start date.");
            return;
        }

        let finalLocation = "All Pakistan";
        if (locationType === 'specific') {
            if (selectedCity && selectedProv) finalLocation = `${selectedCity}, ${selectedProv}`;
            else if (selectedProv) finalLocation = selectedProv;
            else finalLocation = "All Pakistan";
        }

        setProcessing(true);
        try {
            // 1. Create Campaign
            const newCampaign: Omit<AdCampaign, 'id'> = {
                vendorId: user.id,
                listingId: selectedListing.id,
                listingTitle: selectedListing.title,
                listingImage: selectedListing.imageUrl,
                type: campaignType,
                goal,
                status: 'pending_approval',
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                durationDays: duration,
                totalCost,
                targetLocation: finalLocation,
                impressions: 0,
                clicks: 0,
                ctr: 0,
                cpc: 0,
                conversions: 0
            };

            await addDoc(collection(db, 'campaigns'), newCampaign);

            // 2. Prepare Transaction & Deduction
            const userRef = doc(db, 'users', user.id);
            const newTx: Transaction = {
                id: `tx_ad_${Date.now()}`,
                type: 'promotion', // Important for Finance Ledger
                amount: totalCost,
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                description: `Campaign: ${campaignType.replace('_', ' ')}`
            };

            // 3. Fallback for Demo Mode (Local Storage)
            // This ensures the Vendor UI updates instantly even if Firestore writes fail
            try {
                const demoWallets = JSON.parse(localStorage.getItem('demo_user_wallets') || '{}');
                const demoHistory = JSON.parse(localStorage.getItem('demo_user_history') || '{}');
                
                // Update Wallet
                const currentBalance = user?.wallet?.balance || 0;
                const currentSpend = user?.wallet?.totalSpend || 0;
                
                demoWallets[user.id] = {
                    balance: currentBalance - totalCost,
                    totalSpend: currentSpend + totalCost,
                    lastUpdated: Date.now()
                };

                // Add Transaction History
                const userHistory = demoHistory[user.id] || [];
                userHistory.push(newTx);
                demoHistory[user.id] = userHistory;

                localStorage.setItem('demo_user_wallets', JSON.stringify(demoWallets));
                localStorage.setItem('demo_user_history', JSON.stringify(demoHistory));
                window.dispatchEvent(new Event('wallet_updated'));
            } catch (localErr: any) {
                // Fix: Concatenate string to avoid circular JSON error
                console.warn("Local storage update failed: " + (localErr?.message || String(localErr)));
            }

            // 4. Update Firestore
            await updateDoc(userRef, {
                "wallet.balance": walletBalance - totalCost,
                "wallet.totalSpend": (user.wallet?.totalSpend || 0) + totalCost,
                walletHistory: arrayUnion(newTx)
            });

            alert("✅ Campaign Created! It is now under review.");
            onSuccess();

        } catch (e: any) {
            const msg = e.message || String(e);
            if (e.code === 'permission-denied' || msg.includes('permission') || msg.includes('Missing or insufficient permissions')) {
                // If local storage worked, we can still show success in Demo mode
                alert("✅ Campaign Created (Demo Mode)\nYour wallet has been updated locally.");
                onSuccess();
            } else {
                // Fix: Concatenate string to avoid circular JSON error
                console.error("Campaign creation failed: " + msg);
                alert("Failed to create campaign.");
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 bg-gray-50 dark:bg-gray-800 p-6 border-r border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6">Create Campaign</h3>
                <div className="space-y-0 relative">
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-600 z-0"></div>
                    {[
                        { num: 1, label: "Choose Goal & Type" },
                        { num: 2, label: "Select Content" },
                        { num: 3, label: "Targeting & Budget" },
                        { num: 4, label: "Review & Pay" }
                    ].map((s) => (
                        <div key={s.num} className="relative z-10 flex items-center gap-4 py-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                                step === s.num 
                                ? 'bg-primary border-primary text-white' 
                                : step > s.num 
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-500'
                            }`}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <span className={`font-medium ${step === s.num ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-2/3 flex flex-col">
                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">What is your main goal?</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['traffic', 'calls', 'awareness'].map((g) => (
                                        <button 
                                            key={g}
                                            onClick={() => setGoal(g as any)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${goal === g ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                        >
                                            <div className="text-2xl mb-2">{g === 'traffic' ? '🖱️' : g === 'calls' ? '📞' : '📢'}</div>
                                            <div className="font-bold text-gray-800 dark:text-white capitalize">{g}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Select Ad Type</label>
                                <div className="space-y-3">
                                    <div onClick={() => setCampaignType('featured_listing')} className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${campaignType === 'featured_listing' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 dark:text-white">Featured Listing</div>
                                            <div className="text-sm text-gray-500">Top of search results.</div>
                                        </div>
                                        <div className="font-bold text-primary">Rs. {adRates.featured_listing || 100}/day</div>
                                    </div>
                                    
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-blue-800 dark:text-blue-200 text-sm font-medium">
                                        If you want to Promote your business on Homepage Banner Ad, Kindly Contact on Whatsapp +923265520658
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Select Listing to Promote</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {listings.map(l => (
                                    <div 
                                        key={l.id}
                                        onClick={() => setSelectedListingId(l.id)}
                                        className={`flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedListingId === l.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'}`}
                                    >
                                        <img src={l.imageUrl} className="w-16 h-16 rounded-lg object-cover" alt="" />
                                        <div>
                                            <div className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">{l.title}</div>
                                            <div className="text-xs text-gray-500">Rs. {l.price}</div>
                                        </div>
                                    </div>
                                ))}
                                {listings.length === 0 && <p className="text-gray-500">No active listings found.</p>}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Schedule */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Schedule Campaign</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            min={startDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full p-2 rounded-lg border dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">Total Duration: <span className="font-bold text-primary">{duration} Days</span></div>
                            </div>
                            
                            {/* Targeting */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Targeting</label>
                                <div className="flex gap-4 mb-4">
                                    <button onClick={() => { setLocationType('broad'); }} className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-bold transition-all ${locationType === 'broad' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>All Pakistan</button>
                                    <button onClick={() => setLocationType('specific')} className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-bold transition-all ${locationType === 'specific' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500'}`}>Specific City</button>
                                </div>
                                {locationType === 'specific' && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <select value={selectedProv} onChange={(e) => { setSelectedProv(e.target.value); setSelectedCity(''); }} className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm outline-none">
                                            <option value="">Select Province</option>
                                            {Object.keys(PAKISTAN_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                        <select value={selectedCity} onChange={(e) => { setSelectedCity(e.target.value); }} disabled={!selectedProv} className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-sm outline-none disabled:opacity-50">
                                            <option value="">Select City</option>
                                            {selectedProv && PAKISTAN_LOCATIONS[selectedProv].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            {/* Budget Summary */}
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Estimated Total Cost</span>
                                <span className="font-bold text-xl text-primary">Rs. {totalCost.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {step === 4 && selectedListing && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                <h4 className="font-bold text-gray-800 dark:text-white mb-2">Summary</h4>
                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="flex justify-between"><span>Campaign:</span> <span className="font-medium capitalize">{campaignType.replace('_', ' ')}</span></div>
                                    <div className="flex justify-between"><span>Listing:</span> <span className="font-medium truncate max-w-[150px]">{selectedListing.title}</span></div>
                                    <div className="flex justify-between"><span>Schedule:</span> <span className="font-medium">{new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</span></div>
                                    <div className="flex justify-between"><span>Duration:</span> <span className="font-medium">{duration} Days</span></div>
                                    <div className="flex justify-between"><span>Total Cost:</span> <span className="font-bold text-primary">Rs. {totalCost.toLocaleString()}</span></div>
                                </div>
                            </div>
                            
                            {!canAfford && (
                                <div className="text-center text-red-500 text-sm font-medium bg-red-50 p-2 rounded-lg">
                                    ⚠️ Insufficient balance.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white dark:bg-dark-surface border-t border-gray-100 dark:border-gray-700 flex justify-between mt-auto">
                    {step > 1 ? (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Back</button>
                    ) : (
                        <button onClick={onCancel} className="px-6 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                    )}

                    {step < 4 ? (
                        <button 
                            onClick={() => {
                                if (step === 2 && !selectedListingId) return alert("Please select a listing");
                                if (step === 3 && locationType === 'specific' && !selectedCity) return alert("Please select a city");
                                setStep(step + 1);
                            }}
                            className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark shadow-md"
                        >
                            Next
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={!canAfford || processing}
                            className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {processing && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                            Pay & Launch
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const HistoryView = ({ campaigns }: { campaigns: AdCampaign[] }) => {
    const pastCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'rejected' || c.status === 'paused');

    return (
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Campaign History</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Campaign</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Performance</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {pastCampaigns.length > 0 ? pastCampaigns.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 opacity-75">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{c.listingTitle}</div>
                                    <div className="text-xs text-gray-500">{c.type}</div>
                                    <span className={`text-[10px] px-1.5 rounded ${c.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'}`}>{c.status}</span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                    {c.clicks} Clicks / {c.impressions} Views
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                                    Rs. {c.totalCost}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-500">No past campaigns.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VendorPromotions;
