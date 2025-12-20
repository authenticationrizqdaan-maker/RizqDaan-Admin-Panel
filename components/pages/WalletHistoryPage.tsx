
import React, { useState, useEffect } from 'react';
import { User, DepositRequest } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface WalletHistoryPageProps {
  user: User;
  onNavigate: (view: 'account') => void;
}

const WalletHistoryPage: React.FC<WalletHistoryPageProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits'>('transactions');
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Also track local overrides for immediate feedback
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

  // Load Deposit Requests
  useEffect(() => {
      if (!db || !user) return;
      
      const q = query(collection(db, 'deposits'), where('userId', '==', user.id));
      const unsubscribe = onSnapshot(q, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest));
          // Sort by date desc
          data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setDeposits(data);
          setLoading(false);
      }, (err) => {
          // Log only the message
          console.error("Error loading deposits: " + (err?.message || "Unknown"));
          setLoading(false);
      });

      return () => unsubscribe();
  }, [user]);

  // Read Local Overrides (Sync with Admin Actions)
  useEffect(() => {
      const loadOverrides = () => {
          try {
              const saved = localStorage.getItem('finance_overrides_v2'); // UPDATED KEY
              if (saved) {
                  setLocalOverrides(JSON.parse(saved));
              }
          } catch (e) {
              console.warn("Failed to load local overrides");
          }
      };
      
      loadOverrides();
      // Listen for updates from other components
      window.addEventListener('wallet_updated', loadOverrides);
      window.addEventListener('storage', loadOverrides); // Cross-tab sync

      return () => {
          window.removeEventListener('wallet_updated', loadOverrides);
          window.removeEventListener('storage', loadOverrides);
      }
  }, []);

  // Load Transactions from User Object
  const transactions = (user.walletHistory || []).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="animate-fade-in pb-20">
      <header className="flex items-center mb-6">
        <button onClick={() => onNavigate('account')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">Funds History</h1>
      </header>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'transactions' ? 'bg-white dark:bg-dark-surface shadow text-primary dark:text-white' : 'text-gray-500'}`}
          >
              Transactions
          </button>
          <button 
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'deposits' ? 'bg-white dark:bg-dark-surface shadow text-primary dark:text-white' : 'text-gray-500'}`}
          >
              Deposit Requests
          </button>
      </div>

      {activeTab === 'transactions' ? (
          <div className="space-y-3">
              {transactions.length > 0 ? (
                  transactions.map(tx => {
                      const isCredit = ['deposit', 'bonus', 'referral_bonus'].includes(tx.type);
                      return (
                          <div key={tx.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      {isCredit ? (
                                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                      ) : (
                                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                      )}
                                  </div>
                                  <div>
                                      <p className="font-bold text-gray-800 dark:text-white text-sm capitalize">{tx.type.replace('_', ' ')}</p>
                                      <p className="text-xs text-gray-500">{tx.date}</p>
                                      <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{tx.description}</p>
                                  </div>
                              </div>
                              <span className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                                  {isCredit ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                              </span>
                          </div>
                      );
                  })
              ) : (
                  <div className="text-center py-12 text-gray-500">
                      <p>No transaction history yet.</p>
                  </div>
              )}
          </div>
      ) : (
          <div className="space-y-3">
              {loading ? (
                  <div className="text-center py-10"><span className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent inline-block"></span></div>
              ) : deposits.length > 0 ? (
                  deposits.map(req => {
                      // Check for local overrides (in case DB write was blocked but simulated)
                      let status = localOverrides[req.id] || req.status;

                      // SINGLE SOURCE OF TRUTH CHECK (Same as Admin)
                      // Check if user has received the funds in their history locally
                      try {
                          const demoHistory = JSON.parse(localStorage.getItem('demo_user_history') || '{}');
                          const userLocalHistory = demoHistory[req.userId] || [];
                          const hasLocalTx = userLocalHistory.some((tx: any) => 
                              tx.type === 'deposit' && tx.description?.includes(req.transactionId)
                          );
                          if (hasLocalTx) status = 'approved';
                      } catch(e) {}

                      // Check DB History
                      const hasTransaction = user.walletHistory?.some(tx => 
                          tx.type === 'deposit' && tx.description?.includes(req.transactionId)
                      );
                      
                      if (hasTransaction) status = 'approved';

                      return (
                          <div key={req.id} className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Deposit</span>
                                      <h3 className="font-bold text-gray-800 dark:text-white">Rs. {req.amount.toLocaleString()}</h3>
                                  </div>
                                  <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${
                                      status === 'approved' ? 'bg-green-100 text-green-700' : 
                                      status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                      'bg-yellow-100 text-yellow-700'
                                  }`}>
                                      {status}
                                  </span>
                              </div>
                              <div className="text-xs text-gray-500 space-y-1">
                                  <div className="flex justify-between"><span>Date:</span> <span>{req.date}</span></div>
                                  <div className="flex justify-between"><span>Method:</span> <span>{req.method}</span></div>
                                  <div className="flex justify-between"><span>Trx ID:</span> <span className="font-mono">{req.transactionId}</span></div>
                              </div>
                          </div>
                      );
                  })
              ) : (
                  <div className="text-center py-12 text-gray-500">
                      <p>No deposit requests found.</p>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};

export default WalletHistoryPage;
