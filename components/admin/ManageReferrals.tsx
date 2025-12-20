
import React, { useState, useEffect } from 'react';
import { User, ReferralSettings } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ManageReferralsProps {
    users: User[];
}

type ReferralTab = 'dashboard' | 'configuration' | 'leaderboard';

const ManageReferrals: React.FC<ManageReferralsProps> = ({ users }) => {
    const [activeTab, setActiveTab] = useState<ReferralTab>('dashboard');
    const [settings, setSettings] = useState<ReferralSettings>({
        inviterBonus: 200,
        inviteeBonus: 300,
        badgeThreshold: 5,
        isActive: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!db) return;
        const unsub = onSnapshot(doc(db, 'settings', 'referrals'), (snap) => {
            if (snap.exists()) {
                setSettings(snap.data() as ReferralSettings);
            }
        }, (e: any) => {
            console.error("Referral settings error: " + e.message);
        });
        return () => unsub();
    }, []);

    const safeUsers = users || [];
    const totalInvites = safeUsers.reduce((acc, user) => acc + (user.referralStats?.totalInvited || 0), 0);
    const totalPayouts = safeUsers.reduce((acc, user) => acc + (user.referralStats?.totalEarned || 0), 0);
    
    const topReferrers = [...safeUsers]
        .filter(u => !u.isAdmin && (u.referralStats?.totalInvited || 0) > 0)
        .sort((a, b) => (b.referralStats?.totalInvited || 0) - (a.referralStats?.totalInvited || 0))
        .slice(0, 5)
        .map(u => ({
            name: (u.name || 'User').split(' ')[0],
            invites: u.referralStats?.totalInvited || 0
        }));

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (db) {
            try {
                await setDoc(doc(db, 'settings', 'referrals'), settings, { merge: true });
                alert("Settings Updated!");
            } catch (e) {}
        }
        setSaving(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Referral Center</h2>
                    <p className="text-gray-500 text-sm">Configure rewards and track growth.</p>
                </div>

                <div className="flex bg-white dark:bg-dark-surface p-1 rounded-xl shadow-sm border dark:border-gray-700">
                    {[
                        { id: 'dashboard', label: 'Stats', icon: '📊' },
                        { id: 'configuration', label: 'Settings', icon: '⚙️' },
                        { id: 'leaderboard', label: 'Network', icon: '🏆' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ReferralTab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id 
                                ? 'bg-primary text-white shadow-md' 
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl text-white shadow-lg">
                            <p className="text-blue-100 text-xs uppercase font-bold">Total Invites</p>
                            <h3 className="text-3xl font-bold mt-1">{totalInvites}</h3>
                        </div>
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border dark:border-gray-700">
                            <p className="text-gray-500 text-xs uppercase font-bold">Credits Given</p>
                            <h3 className="text-2xl font-bold text-green-600">Rs. {totalPayouts.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border dark:border-gray-700">
                            <p className="text-gray-500 text-xs uppercase font-bold">System Status</p>
                            <h3 className={`text-2xl font-bold ${settings.isActive ? 'text-green-600' : 'text-red-600'}`}>{settings.isActive ? 'ACTIVE' : 'PAUSED'}</h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-dark-surface p-6 rounded-xl border dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-6">Top Influencers</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer>
                                <BarChart data={topReferrers} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={80} />
                                    <Tooltip />
                                    <Bar dataKey="invites" fill="#002f34" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'configuration' && (
                <div className="max-w-2xl mx-auto bg-white dark:bg-dark-surface rounded-xl shadow-lg border dark:border-gray-700 p-8">
                    <form onSubmit={handleSaveSettings} className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                                <h4 className="font-bold dark:text-white">Referral Toggle</h4>
                                <p className="text-xs text-gray-500">Enable/Disable the entire system.</p>
                            </div>
                            <input type="checkbox" checked={settings.isActive} onChange={() => setSettings({...settings, isActive: !settings.isActive})} className="h-6 w-6 text-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Inviter Reward</label>
                                <input type="number" value={settings.inviterBonus} onChange={e => setSettings({...settings, inviterBonus: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Invitee Reward</label>
                                <input type="number" value={settings.inviteeBonus} onChange={e => setSettings({...settings, inviteeBonus: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white" />
                            </div>
                        </div>
                        <button type="submit" disabled={saving} className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark">
                            {saving ? 'Saving...' : 'Update Settings'}
                        </button>
                    </form>
                </div>
            )}

            {activeTab === 'leaderboard' && (
                <div className="bg-white dark:bg-dark-surface rounded-xl shadow-md overflow-hidden border dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">User</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">Code</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">Invites</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase">Earned</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {safeUsers.filter(u => !u.isAdmin).sort((a,b) => (b.referralStats?.totalInvited || 0) - (a.referralStats?.totalInvited || 0)).map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 dark:text-white font-bold">{u.name || 'Anonymous'}</td>
                                    <td className="px-6 py-4 text-xs font-mono">{u.referralCode || 'N/A'}</td>
                                    <td className="px-6 py-4">{u.referralStats?.totalInvited || 0}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">Rs. {u.referralStats?.totalEarned || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ManageReferrals;
