
import React, { useState, useEffect } from 'react';
import { User, ReferralSettings } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface ReferralPageProps {
  user: User;
  onNavigate: (view: 'account') => void;
}

const ReferralPage: React.FC<ReferralPageProps> = ({ user, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<ReferralSettings>({ 
      inviterBonus: 200, 
      inviteeBonus: 300, 
      badgeThreshold: 5, 
      isActive: true 
  });

  useEffect(() => {
      if(!db) return;
      getDoc(doc(db, 'settings', 'referrals')).then(snap => {
          if(snap.exists()) setSettings(snap.data() as ReferralSettings);
      });
  }, []);

  const referralCode = user.referralCode || 'GENERATING...';
  const totalInvited = user.referralStats?.totalInvited || 0;
  const totalEarned = user.referralStats?.totalEarned || 0;

  // Calculate Progress to Badge
  const progressPercent = Math.min(100, (totalInvited / settings.badgeThreshold) * 100);
  const hasBadge = totalInvited >= settings.badgeThreshold;

  const referralHistory = (user.walletHistory || [])
    .filter(t => t.type === 'referral_bonus')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
      const text = `Join RizqDaan and get Rs.${settings.inviteeBonus} free Ad Credit! Use my code: ${referralCode}`;
      
      const shareData = {
          title: 'Join RizqDaan',
          text: text,
          url: window.location.href 
      };

      try {
          if (navigator.share && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
              await navigator.share(shareData);
          } else {
              await navigator.clipboard.writeText(text + " " + window.location.href);
              alert("Referral link copied to clipboard!");
          }
      } catch (e: any) {
          console.error("Share failed:", e.message);
      }
  };

  return (
    <div className="animate-fade-in pb-20">
      <header className="flex items-center mb-6">
        <button onClick={() => onNavigate('account')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">Earn Ad Credits</h1>
      </header>

      <div className="space-y-6">
        
        {/* Strategy 1: The "Free Advertising" Model - Virtual Ad Credits */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">Promote Your Shop for FREE!</h2>
                <p className="text-purple-100 mb-4 text-sm">
                    Invite a friend. They get <span className="font-bold">Rs. {settings.inviteeBonus}</span>. 
                    You get <span className="font-bold">Rs. {settings.inviterBonus}</span> Ad Credit.
                </p>
                
                <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-mono text-xl tracking-widest border border-white/30 cursor-pointer hover:bg-white/30 transition-colors" onClick={handleCopy}>
                    {referralCode}
                </div>
                <p className="text-xs text-purple-200 mt-2">Tap to copy code</p>
            </div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-200 text-center">
            <strong>Note:</strong> Referral earnings are <span className="underline">Ad Credits</span> only and cannot be withdrawn as cash. Use them to feature your listings!
        </div>

        {/* Strategy 3: The "Trust Badge" Strategy (Gamification) */}
        <div className="bg-white dark:bg-dark-surface p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">Community Star Badge 🌟</h3>
                {hasBadge ? (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold border border-green-200 shadow-sm">Unlocked!</span>
                ) : (
                    <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{totalInvited} / {settings.badgeThreshold} Invites</span>
                )}
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-3 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
                {hasBadge 
                    ? "Congratulations! You have unlocked the Community Star badge on your profile. Customers trust verified stars more!"
                    : `Invite ${settings.badgeThreshold - totalInvited} more friends to unlock the exclusive badge and build trust with customers.`
                }
            </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-semibold text-gray-700 dark:text-white active:scale-95 transition-transform hover:bg-gray-50 dark:hover:bg-gray-800"
            >
                {copied ? <span className="text-green-600">Copied!</span> : 
                <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Copy Code
                </>}
            </button>
            <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl shadow-md font-semibold active:scale-95 transition-transform hover:bg-primary-dark"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share
            </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Ad Credits Earned</p>
                <p className="text-2xl font-bold text-green-600">Rs. {totalEarned}</p>
            </div>
            <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Friends Invited</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalInvited}</p>
            </div>
        </div>

        {/* History */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h3 className="font-bold text-gray-700 dark:text-white">Earnings History</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {referralHistory.length > 0 ? (
                    referralHistory.map((tx) => (
                        <div key={tx.id} className="p-4 flex justify-between items-center">
                            <div>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{tx.description}</p>
                                <p className="text-xs text-gray-500">{tx.date}</p>
                            </div>
                            <span className="text-green-600 font-bold text-sm">+ Rs. {tx.amount}</span>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center text-gray-500 text-sm">
                        No rewards yet. Invite friends to start earning!
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ReferralPage;
