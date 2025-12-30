
import React, { useState, useEffect } from 'react';
import { User, Listing, AdCampaign, Transaction } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { PAKISTAN_LOCATIONS } from '../../constants';

interface VendorPromotionsProps {
  user: User | null;
  initialListingId?: string;
  onNavigate?: (view: 'add-balance') => void;
}

const cleanForStorage = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        if (key === '_firestore' || key === 'firestore' || key === '_db') return undefined;
        return value;
    }));
};

const VendorPromotions: React.FC<VendorPromotionsProps> = ({ user, initialListingId, onNavigate }) => {
  const [activeView, setActiveView] = useState<'dashboard' | 'create' | 'history'>('dashboard');
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [adRates, setAdRates] = useState({ featured_listing: 100, banner_ad: 500, social_boost: 300 });

  useEffect(() => {
      if (initialListingId) setActiveView('create');
  }, [initialListingId]);

  useEffect(() => {
      if (!user) return;
      if (!db) { setLoading(false); return; }

      const qListings = query(collection(db, 'listings'), where('vendorId', '==', user.id));
      const unsubListings = onSnapshot(qListings, (snap) => {
          setListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)).filter(l => l.status === 'active'));
      });

      const qCampaigns = query(collection(db, 'campaigns'), where('vendorId', '==', user.id));
      const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdCampaign));
          setCampaigns(data);
          setLoading(false);
          try {
              localStorage.setItem('user_campaigns_cache', JSON.stringify(cleanForStorage(data)));
          } catch(e) {}
      });

      const pricingRef = doc(db, 'settings', 'ad_pricing');
      const unsubPricing = onSnapshot(pricingRef, (docSnap) => {
          if (docSnap.exists()) setAdRates(docSnap.data() as any);
      });

      return () => { unsubListings(); unsubCampaigns(); unsubPricing(); };
  }, [user?.id]);

  return (
    <div className="animate-fade-in min-h-[600px]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">🚀 Ads Manager</h2>
            <p className="text-sm text-gray-500">Reach more customers and grow your sales.</p>
        </div>
        <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl border shadow-sm">
            <button onClick={() => setActiveView('dashboard')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeView === 'dashboard' ? 'bg-gray-100 dark:bg-gray-700 text-primary dark:text-white' : 'text-gray-400'}`}>Dashboard</button>
            <button onClick={() => setActiveView('create')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeView === 'create' ? 'bg-primary text-white shadow-md' : 'text-gray-400'}`}>+ New Ad</button>
            <button onClick={() => setActiveView('history')} className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${activeView === 'history' ? 'bg-gray-100 dark:bg-gray-700 text-primary dark:text-white' : 'text-gray-400'}`}>History</button>
        </div>
      </div>
      {activeView === 'dashboard' && <DashboardView campaigns={campaigns} user={user} onAddFunds={() => onNavigate && onNavigate('add-balance')} />}
      {activeView === 'create' && <CreateCampaignWizard user={user} listings={listings} adRates={adRates} onCancel={() => setActiveView('dashboard')} onSuccess={() => setActiveView('dashboard')} initialListingId={initialListingId} />}
      {activeView === 'history' && <HistoryView campaigns={campaigns} />}
    </div>
  );
};

const DashboardView = ({ campaigns, user, onAddFunds }: { campaigns: AdCampaign[], user: User | null, onAddFunds: () => void }) => {
    const displayAds = campaigns.filter(c => ['active', 'paused', 'pending_approval'].includes(c.status));
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleToggleStatus = async (campaign: AdCampaign) => {
        if (!db || !user) return;
        setProcessingId(campaign.id);
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        
        try {
            const batch = writeBatch(db);
            const campaignRef = doc(db, 'campaigns', campaign.id);
            batch.update(campaignRef, { status: newStatus });
            
            // SYNC: If paused, remove from featured section. If active, put back in featured.
            if (campaign.listingId) {
                const listingRef = doc(db, 'listings', campaign.listingId);
                batch.update(listingRef, { isPromoted: newStatus === 'active' });
            }
            
            await batch.commit();
        } catch (e: any) {
            alert("Error updating status: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteAndRefund = async (campaign: AdCampaign) => {
        if (!db || !user) return;
        
        const isPending = campaign.status === 'pending_approval';
        const confirmMsg = isPending 
            ? "Cancel this request? Full refund of Rs. " + campaign.totalCost + " will be credited back."
            : "⚠️ STOP AD & REFUND?\nStopping this campaign now will return the budget for the REMAINING days to your wallet. The listing will immediately return to a regular (non-featured) status. Proceed?";

        if (!window.confirm(confirmMsg)) return;
        
        setProcessingId(campaign.id);
        try {
            const batch = writeBatch(db);
            let refundAmount = 0;

            if (isPending) {
                // 1. Full refund for pending ads
                refundAmount = campaign.totalCost;
            } else {
                // 2. Pro-rated refund for active/paused ads
                const now = new Date();
                const end = new Date(campaign.endDate);
                const diffMs = end.getTime() - now.getTime();
                // Get remaining full days
                const remainingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                const dailyRate = campaign.totalCost / campaign.durationDays;
                refundAmount = Math.floor(remainingDays * dailyRate);
            }
            
            // 3. Process Wallet Refund
            if (refundAmount > 0) {
                const userRef = doc(db, 'users', user.id);
                const refundTx: Transaction = {
                    id: `tx_ref_${Date.now()}`,
                    type: 'adjustment',
                    amount: refundAmount,
                    date: new Date().toISOString().split('T')[0],
                    status: 'completed',
                    description: `Ad Refund: ${campaign.listingTitle.substring(0,10)}... (${isPending ? 'Cancelled' : 'Stopped early'})`
                };
                
                batch.update(userRef, {
                    "wallet.balance": (user.wallet?.balance || 0) + refundAmount,
                    "wallet.totalSpend": Math.max(0, (user.wallet?.totalSpend || 0) - refundAmount),
                    walletHistory: arrayUnion(refundTx)
                });
            }

            // 4. Remove Featured Status from Listing
            if (campaign.listingId) {
                const listingRef = doc(db, 'listings', campaign.listingId);
                batch.update(listingRef, { isPromoted: false });
            }

            // 5. Mark Campaign as Completed (moves it to history tab)
            const campaignRef = doc(db, 'campaigns', campaign.id);
            batch.update(campaignRef, { 
                status: isPending ? 'rejected' : 'completed', 
                endDate: new Date().toISOString() 
            });

            await batch.commit();
            alert(`✅ Ad stopped. Rs. ${refundAmount.toLocaleString()} has been added back to your balance.`);
            
        } catch (e: any) {
            console.error(e);
            alert("Action failed: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 bg-primary dark:bg-dark-primary rounded-2xl text-white shadow-lg flex flex-col justify-between h-36">
                    <div>
                        <p className="text-[10px] uppercase font-black opacity-60 tracking-widest">Available Balance</p>
                        <h3 className="text-2xl font-bold">Rs. {(user?.wallet?.balance || 0).toLocaleString()}</h3>
                    </div>
                    <button onClick={onAddFunds} className="text-xs bg-white/20 hover:bg-white/30 py-2 rounded-lg font-bold transition-colors">Add Funds</button>
                </div>
                <div className="p-6 bg-white dark:bg-dark-surface border rounded-2xl shadow-sm h-36 flex flex-col justify-between">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Live Ads</p>
                    <h3 className="text-3xl font-bold dark:text-white">{campaigns.filter(c => c.status === 'active').length}</h3>
                    <p className="text-[10px] text-green-600 font-bold">Running</p>
                </div>
                <div className="p-6 bg-white dark:bg-dark-surface border rounded-2xl shadow-sm h-36 flex flex-col justify-between">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Conversions</p>
                    <h3 className="text-3xl font-bold dark:text-white">{campaigns.reduce((acc, c) => acc + (c.conversions || 0), 0)}</h3>
                    <p className="text-[10px] text-primary font-bold">Total Contacts</p>
                </div>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                    <h3 className="font-bold dark:text-white">Active & Pending Promotions</h3>
                    <span className="text-[10px] font-black text-gray-400 uppercase">Manage Ads</span>
                </div>
                {displayAds.length === 0 ? (
                    <div className="p-16 text-center text-gray-500">No campaigns found. Start one to see analytics!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase">Ad Content</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Status</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Impr.</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Conv.</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase">CTR</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                                {displayAds.map(ad => (
                                    <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <img src={ad.listingImage} className="w-10 h-10 rounded-lg object-cover" />
                                            <div>
                                                <div className="text-sm font-bold dark:text-white line-clamp-1">{ad.listingTitle}</div>
                                                <div className="text-[10px] text-primary dark:text-teal-500 font-bold uppercase">{ad.type.replace('_', ' ')}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                ad.status === 'active' ? 'bg-green-100 text-green-600' : 
                                                ad.status === 'paused' ? 'bg-yellow-100 text-yellow-600' : 
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {ad.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm font-bold dark:text-white">{ad.impressions || 0}</td>
                                        <td className="px-4 py-4 text-center text-sm font-black text-green-600">{ad.conversions || 0}</td>
                                        <td className="px-4 py-4 text-center text-sm font-bold text-primary dark:text-teal-400">{ad.ctr || 0}%</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {['active', 'paused'].includes(ad.status) && (
                                                    <button 
                                                        disabled={processingId === ad.id}
                                                        onClick={() => handleToggleStatus(ad)}
                                                        className={`p-2 rounded-lg border transition-all ${ad.status === 'active' ? 'text-yellow-600 border-yellow-100 hover:bg-yellow-50' : 'text-green-600 border-green-100 hover:bg-green-50'}`}
                                                        title={ad.status === 'active' ? 'Pause Ad' : 'Resume Ad'}
                                                    >
                                                        {ad.status === 'active' ? (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                        )}
                                                    </button>
                                                )}
                                                <button 
                                                    disabled={processingId === ad.id}
                                                    onClick={() => handleDeleteAndRefund(ad)}
                                                    className="p-2 text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-all"
                                                    title="Stop & Refund Unused Budget"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const CreateCampaignWizard = ({ user, listings, adRates, onCancel, onSuccess, initialListingId }: { user: User | null, listings: Listing[], adRates: any, onCancel: () => void, onSuccess: () => void, initialListingId?: string }) => {
    const [step, setStep] = useState(1);
    const [selectedListingId, setSelectedListingId] = useState(initialListingId || '');
    const [campaignType, setCampaignType] = useState<'featured_listing' | 'banner_ad' | 'social_boost'>('featured_listing');
    const [duration, setDuration] = useState(7);
    const [goal, setGoal] = useState<'traffic' | 'calls' | 'awareness'>('traffic');
    const [targetLocation, setTargetLocation] = useState('All Pakistan');
    const [processing, setProcessing] = useState(false);
    const totalCost = duration * (adRates[campaignType] || 100);
    const canAfford = (user?.wallet?.balance || 0) >= totalCost;
    const handleSubmit = async () => {
        if (!user || !canAfford || !db) return;
        setProcessing(true);
        const listing = listings.find(l => l.id === selectedListingId);
        const campData: Omit<AdCampaign, 'id'> = {
            vendorId: user.id,
            listingId: selectedListingId,
            listingTitle: listing?.title || 'Unknown Ad',
            listingImage: listing?.imageUrl || '',
            type: campaignType,
            goal,
            status: 'pending_approval',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + duration * 86400000).toISOString(),
            durationDays: duration,
            totalCost,
            targetLocation,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            cpc: 0,
            conversions: 0
        };
        try {
            await addDoc(collection(db, 'campaigns'), campData);
            const tx: Transaction = {
                id: `tx_ad_${Date.now()}`,
                type: 'promotion',
                amount: totalCost,
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                description: `Promo: ${campaignType.replace('_', ' ')} (${duration} Days)`
            };
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                "wallet.balance": (user.wallet?.balance || 0) - totalCost,
                "wallet.totalSpend": (user.wallet?.totalSpend || 0) + totalCost,
                walletHistory: arrayUnion(tx)
            });
            alert("✅ Ad request submitted for approval!");
            onSuccess();
        } catch (e: any) {
            alert("Error creating ad: " + e.message);
        } finally {
            setProcessing(false);
        }
    };
    const renderStep1 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold dark:text-white">1. Choose Promotion Type</h3>
            <div className="grid grid-cols-1 gap-4">
                {[
                    { id: 'featured_listing', label: 'Featured Listing', desc: 'Appear at the top of search results.', icon: '⭐' },
                    { id: 'banner_ad', label: 'Home Banner Ad', desc: 'Main slider on home page (Max visibility).', icon: '🖼️' },
                    { id: 'social_boost', label: 'Social Media Boost', desc: 'Promotion across our WhatsApp & FB groups.', icon: '🚀' }
                ].map(type => (
                    <button 
                        key={type.id}
                        onClick={() => setCampaignType(type.id as any)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all ${campaignType === type.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="text-2xl">{type.icon}</span>
                            <span className="font-black text-primary">Rs. {adRates[type.id]}/day</span>
                        </div>
                        <h4 className="font-bold dark:text-white mt-2">{type.label}</h4>
                        <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                    </button>
                ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg">Continue</button>
        </div>
    );
    const renderStep2 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold dark:text-white">2. Select Your Ad Content</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {listings.map(l => (
                    <button 
                        key={l.id} 
                        onClick={() => setSelectedListingId(l.id)}
                        className={`flex p-3 border-2 rounded-2xl items-center gap-4 transition-all ${selectedListingId === l.id ? 'border-primary bg-primary/5' : 'border-gray-100 dark:border-gray-800'}`}
                    >
                        <img src={l.imageUrl} className="w-16 h-16 object-cover rounded-xl" />
                        <div className="text-left overflow-hidden">
                            <h5 className="font-bold dark:text-white truncate">{l.title}</h5>
                            <p className="text-xs text-gray-500">Rs. {l.price}</p>
                        </div>
                    </button>
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-3 text-gray-500 font-bold border rounded-xl">Back</button>
                <button onClick={() => setStep(3)} disabled={!selectedListingId} className="flex-[2] py-3 bg-primary text-white font-bold rounded-xl shadow-lg disabled:opacity-50">Next Step</button>
            </div>
        </div>
    );
    const renderStep3 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold dark:text-white">3. Targeting & Goal</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Promotion Duration</label>
                    <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none">
                        <option value={7}>7 Days</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>1 Month</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Campaign Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['traffic', 'calls', 'awareness'].map(g => (
                            <button key={g} onClick={() => setGoal(g as any)} className={`py-2 text-xs font-bold rounded-lg border-2 capitalize ${goal === g ? 'border-primary bg-primary/5 text-primary' : 'text-gray-400'}`}>{g}</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Target Location</label>
                    <select value={targetLocation} onChange={e => setTargetLocation(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:text-white outline-none">
                        <option value="All Pakistan">All Pakistan</option>
                        {Object.keys(PAKISTAN_LOCATIONS).map(prov => (
                            <optgroup key={prov} label={prov}>
                                {PAKISTAN_LOCATIONS[prov].map(city => <option key={city} value={city}>{city}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 py-3 text-gray-500 font-bold border rounded-xl">Back</button>
                <button onClick={() => setStep(4)} className="flex-[2] py-3 bg-primary text-white font-bold rounded-xl shadow-lg">Final Review</button>
            </div>
        </div>
    );
    const renderStep4 = () => (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold dark:text-white">4. Confirm & Launch</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-3xl space-y-4 shadow-inner border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between border-b pb-2 dark:border-gray-700"><span className="text-gray-500">Service:</span><span className="font-bold dark:text-white capitalize">{campaignType.replace('_', ' ')}</span></div>
                <div className="flex justify-between border-b pb-2 dark:border-gray-700"><span className="text-gray-500">Duration:</span><span className="font-bold dark:text-white">{duration} Days</span></div>
                <div className="flex justify-between text-lg pt-2"><span className="font-black dark:text-white">Total Cost:</span><span className="font-black text-primary">Rs. {totalCost.toLocaleString()}</span></div>
            </div>
            {!canAfford && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 text-center">Insufficient Balance! Rs. {user?.wallet?.balance || 0}</div>}
            <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="flex-1 py-3 text-gray-500 font-bold border rounded-xl">Back</button>
                <button onClick={handleSubmit} disabled={!canAfford || processing} className="flex-[2] py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                    {processing ? <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> : 'Pay & Launch'}
                </button>
            </div>
        </div>
    );
    return (
        <div className="max-w-xl mx-auto bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-xl border border-gray-50 dark:border-gray-800">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
        </div>
    );
};

const HistoryView = ({ campaigns }: { campaigns: AdCampaign[] }) => {
    const history = campaigns.filter(c => ['completed', 'rejected'].includes(c.status));
    return (
        <div className="bg-white dark:bg-dark-surface rounded-3xl border shadow-sm overflow-hidden">
            <table className="min-w-full divide-y dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase">Ad</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase">Cost</th>
                    </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                    {history.map(ad => (
                        <tr key={ad.id} className="opacity-70">
                            <td className="px-6 py-4 text-sm font-bold dark:text-white">{ad.listingTitle}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ad.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'}`}>
                                    {ad.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-bold dark:text-white">Rs. {ad.totalCost}</td>
                        </tr>
                    ))}
                    {history.length === 0 && (
                        <tr><td colSpan={3} className="p-10 text-center text-gray-400">No past campaign history.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default VendorPromotions;
