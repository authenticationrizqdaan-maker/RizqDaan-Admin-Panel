
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, doc, query, writeBatch, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { AdCampaign, Transaction, User } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ManagePromotionsProps {
    users: User[];
}

type Tab = 'overview' | 'queue' | 'live' | 'history' | 'pricing';

const cleanForStorage = (data: any) => {
    return JSON.parse(JSON.stringify(data, (key, value) => {
        if (key === '_firestore' || key === 'firestore' || key === '_db') return undefined;
        return value;
    }));
};

const ManagePromotions: React.FC<ManagePromotionsProps> = ({ users }) => {
    const [activeTab, setActiveTab] = useState<Tab>('queue');
    const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectModalId, setRejectModalId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [adRates, setAdRates] = useState({
        featured_listing: 100,
        banner_ad: 500,
        social_boost: 300
    });
    const [loadingRates, setLoadingRates] = useState(false);

    useEffect(() => {
        if (!db) return;
        
        const q = query(collection(db, 'campaigns'));
        const unsubCampaigns = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            })) as AdCampaign[];
            setCampaigns(data);
            try {
                localStorage.setItem('admin_campaigns_cache', JSON.stringify(cleanForStorage(data)));
            } catch(e) {}
        });

        const pricingRef = doc(db, 'settings', 'ad_pricing');
        const unsubPricing = onSnapshot(pricingRef, (docSnap) => {
            if (docSnap.exists()) {
                setAdRates(docSnap.data() as any);
            }
        });

        return () => {
            unsubCampaigns();
            unsubPricing();
        };
    }, []);

    const handleToggleStatus = async (campaign: AdCampaign) => {
        if (!db) return;
        setProcessingId(campaign.id);
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        
        try {
            const batch = writeBatch(db);
            const campaignRef = doc(db, 'campaigns', campaign.id);
            batch.update(campaignRef, { status: newStatus });
            
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

    const handleStopAndRefund = async (campaign: AdCampaign) => {
        if (!db || !window.confirm("⚠️ ADMIN: STOP AD & REFUND?\nThis will stop the ad immediately, return the listing to a simple state, and refund remaining unspent budget to the vendor's wallet. Proceed?")) return;
        
        setProcessingId(campaign.id);
        try {
            const now = new Date();
            const end = new Date(campaign.endDate);
            const diffMs = end.getTime() - now.getTime();
            const remainingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            const dailyRate = campaign.totalCost / campaign.durationDays;
            const refundAmount = Math.floor(remainingDays * dailyRate);
            
            const batch = writeBatch(db);
            
            if (refundAmount > 0) {
                const vendorRef = doc(db, 'users', campaign.vendorId);
                const refundTx: Transaction = {
                    id: `tx_admin_stop_${Date.now()}`,
                    type: 'adjustment',
                    amount: refundAmount,
                    date: new Date().toISOString().split('T')[0],
                    status: 'completed',
                    description: `Admin Refund: Stopped Ad "${campaign.listingTitle.substring(0,10)}..."`
                };
                
                const vendorSnap = await getDoc(vendorRef);
                const currentBalance = vendorSnap.data()?.wallet?.balance || 0;
                const currentSpend = vendorSnap.data()?.wallet?.totalSpend || 0;
                
                batch.update(vendorRef, {
                    "wallet.balance": currentBalance + refundAmount,
                    "wallet.totalSpend": Math.max(0, currentSpend - refundAmount),
                    walletHistory: arrayUnion(refundTx)
                });
            }

            if (campaign.listingId) {
                const listingRef = doc(db, 'listings', campaign.listingId);
                batch.update(listingRef, { isPromoted: false });
            }

            const campaignRef = doc(db, 'campaigns', campaign.id);
            batch.update(campaignRef, { status: 'completed', endDate: new Date().toISOString() });

            await batch.commit();
            alert("✅ Ad stopped and vendor refunded Rs. " + refundAmount.toLocaleString());
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredList = campaigns.filter(c => {
        const vendor = users.find(u => u.id === c.vendorId);
        const search = searchTerm.toLowerCase();
        return (
            c.listingTitle.toLowerCase().includes(search) ||
            vendor?.shopName?.toLowerCase().includes(search) ||
            c.id.includes(search)
        );
    });

    const totalRevenue = campaigns.filter(c => c.status !== 'rejected' && c.status !== 'pending_approval').reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const activeAds = filteredList.filter(c => c.status === 'active' || c.status === 'paused');
    const pendingAds = filteredList.filter(c => c.status === 'pending_approval');
    const historyAds = filteredList.filter(c => ['completed', 'rejected'].includes(c.status));

    const chartData = [
        { name: 'Banner Ads', value: campaigns.filter(c => c.type === 'banner_ad').reduce((sum, c) => sum + (c.totalCost || 0), 0), color: '#3A77FF' },
        { name: 'Featured', value: campaigns.filter(c => c.type === 'featured_listing').reduce((sum, c) => sum + (c.totalCost || 0), 0), color: '#002f34' },
        { name: 'Social', value: campaigns.filter(c => c.type === 'social_boost').reduce((sum, c) => sum + (c.totalCost || 0), 0), color: '#FFC800' },
    ];

    const handleApprove = async (campaign: AdCampaign) => {
        if (!db) return;
        setProcessingId(campaign.id);
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + campaign.durationDays * 24 * 60 * 60 * 1000);
        try {
            const batch = writeBatch(db);
            const campaignRef = doc(db, 'campaigns', campaign.id);
            batch.update(campaignRef, {
                status: 'active',
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                priority: 'normal'
            });
            if (campaign.listingId) {
                const listingRef = doc(db, 'listings', campaign.listingId);
                batch.update(listingRef, { isPromoted: true });
            }
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
                userId: campaign.vendorId,
                title: "Ad Request Approved! 🚀",
                message: `Your request for "${campaign.listingTitle}" is live. Targeting: ${campaign.targetLocation}.`,
                type: 'success',
                isRead: false,
                createdAt: new Date().toISOString(),
                link: 'vendor-dashboard'
            });
            await batch.commit();
            alert("✅ Ad Approved & Live!");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModalId || !rejectReason || !db) return;
        setProcessingId(rejectModalId);
        const campaign = campaigns.find(c => c.id === rejectModalId);
        if (!campaign) return;
        try {
            const batch = writeBatch(db);
            const campaignRef = doc(db, 'campaigns', rejectModalId);
            const vendorRef = doc(db, 'users', campaign.vendorId);
            batch.update(campaignRef, { status: 'rejected' });
            const refundAmount = campaign.totalCost;
            const refundTx: Transaction = {
                id: `tx_ref_${Date.now()}`,
                type: 'adjustment',
                amount: refundAmount,
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                description: `Ad Refund: ${rejectReason}`
            };
            const vendorSnap = await getDoc(vendorRef);
            const wallet = vendorSnap.data()?.wallet || { balance: 0, totalSpend: 0 };
            batch.update(vendorRef, {
                "wallet.balance": (wallet.balance || 0) + refundAmount,
                "wallet.totalSpend": Math.max(0, (wallet.totalSpend || 0) - refundAmount),
                walletHistory: arrayUnion(refundTx)
            });
            await batch.commit();
            alert("✅ Rejected & Funds Refunded.");
            setRejectModalId(null);
            setRejectReason('');
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleSavePricing = async () => {
        if (!db) return;
        setLoadingRates(true);
        try {
            await setDoc(doc(db, 'settings', 'ad_pricing'), adRates, { merge: true });
            alert("✅ Pricing Updated!");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoadingRates(false);
        }
    };

    return (
        <div className="animate-fade-in min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">📢 Promotions Center</h2>
                    <p className="text-gray-500 text-sm">Monitor campaigns, revenue, and approval queue.</p>
                </div>
                <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto max-w-full">
                    {[
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'queue', label: 'Queue', icon: '⏳', count: pendingAds.length },
                        { id: 'live', label: 'Live Ads', icon: '🔴', count: activeAds.length },
                        { id: 'history', label: 'History', icon: '📜' },
                        { id: 'pricing', label: 'Rates', icon: '💰' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                            {tab.count !== undefined && tab.count > 0 && <span className={`text-[10px] px-1.5 rounded-full ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>{tab.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-primary to-teal-800 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
                            <p className="text-xs uppercase font-black opacity-60 tracking-widest">Total Ad Revenue</p>
                            <h3 className="text-3xl font-bold mt-1">Rs. {totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl border flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Total Conversions</p>
                                <h3 className="text-2xl font-bold dark:text-white">
                                    {activeAds.reduce((acc, c) => acc + (c.conversions || 0), 0)}
                                </h3>
                            </div>
                            <div className="text-2xl">🎯</div>
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-dark-surface p-6 rounded-2xl border shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-6">Revenue by Ad Category</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer>
                                <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                                        {chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'queue' && (
                <div className="space-y-4">
                    {pendingAds.length === 0 ? (
                        <div className="text-center py-24 bg-white dark:bg-dark-surface rounded-2xl border border-dashed">
                             <div className="text-5xl mb-4 opacity-30">📪</div>
                             <h3 className="text-gray-500 font-bold">Queue is empty</h3>
                        </div>
                    ) : pendingAds.map(ad => (
                        <div key={ad.id} className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden flex-shrink-0 border">
                                <img src={ad.listingImage} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-lg dark:text-white">{ad.listingTitle}</h4>
                                        <p className="text-sm text-primary font-medium">{ad.type.replace('_', ' ').toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-green-600">Rs. {ad.totalCost}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase">{ad.durationDays} Days</div>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase text-gray-400">
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Target: {ad.targetLocation}</span>
                                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">Goal: {ad.goal}</span>
                                </div>
                            </div>
                            <div className="flex md:flex-col gap-2 justify-center">
                                <button onClick={() => handleApprove(ad)} disabled={!!processingId} className="flex-1 px-6 py-2 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all text-sm">Approve</button>
                                <button onClick={() => setRejectModalId(ad.id)} className="flex-1 px-6 py-2 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-100 transition-all text-sm">Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'live' && (
                <div className="overflow-x-auto bg-white dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-gray-800">
                    <table className="min-w-full divide-y dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase">Listing</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Status</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase">Conv.</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-800">
                            {activeAds.map(ad => (
                                <tr key={ad.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <img src={ad.listingImage} className="w-10 h-10 rounded-lg object-cover" />
                                        <span className="text-sm font-bold dark:text-white line-clamp-1">{ad.listingTitle}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ad.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                            {ad.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-bold text-green-600">{ad.conversions || 0}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleToggleStatus(ad)}
                                                className={`p-2 border rounded-lg transition-all ${ad.status === 'active' ? 'text-yellow-600 border-yellow-100' : 'text-green-600 border-green-100'}`}
                                            >
                                                {ad.status === 'active' ? 'Pause' : 'Play'}
                                            </button>
                                            <button 
                                                onClick={() => handleStopAndRefund(ad)}
                                                className="p-2 text-red-600 border border-red-100 rounded-lg hover:bg-red-50"
                                            >
                                                Stop
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
    );
};

export default ManagePromotions;
