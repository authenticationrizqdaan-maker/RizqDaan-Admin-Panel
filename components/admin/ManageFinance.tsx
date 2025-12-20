
import React, { useState, useEffect } from 'react';
import { User, Transaction, WithdrawalRequest, DepositRequest, PaymentInfo } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, collection, onSnapshot, setDoc, increment, writeBatch, arrayUnion, deleteDoc } from 'firebase/firestore';

interface ManageFinanceProps {
  users: User[];
}

const ManageFinance: React.FC<ManageFinanceProps> = ({ users }) => {
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'settings'>('deposits'); 
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [depositFilter, setDepositFilter] = useState<'pending' | 'all'>('pending');
  const [proofUrl, setProofUrl] = useState<string | null>(null); 

  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      type: 'deposit' | 'withdrawal';
      action: 'approve' | 'reject';
      item: any;
  } | null>(null);

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
      bankName: 'JazzCash',
      accountTitle: 'Admin Name',
      accountNumber: '03001234567',
      instructions: 'Please send screenshot after payment.',
      customNote: ''
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Real-time Data Listeners
  useEffect(() => {
      if (!db) return;
      
      const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
          setWithdrawals(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
      }, (err) => {
          if (!err.message.includes('permission')) console.error("Withdrawals listen error", err.message);
      });

      const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
          setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
      }, (err) => {
          if (!err.message.includes('permission')) console.error("Deposits listen error", err.message);
      });

      const unsubSettings = onSnapshot(doc(db, 'settings', 'payment_info'), (snap) => {
          if (snap.exists()) setPaymentInfo(snap.data() as PaymentInfo);
      }, (err) => {
          // Silent fail for non-critical metadata
      });

      return () => {
          unsubWithdrawals();
          unsubDeposits();
          unsubSettings();
      };
  }, []);

  // --- CORE LOGIC: PROCESS DEPOSIT ---
  const executeProcessDeposit = async () => {
      if (!confirmModal || !confirmModal.item || !db) return;
      
      const req = confirmModal.item as DepositRequest;
      const action = confirmModal.action;
      const userId = req.userId;
      const safeAmount = Number(req.amount);
      const targetStatus = action === 'approve' ? 'approved' : 'rejected';
      
      setConfirmModal(null);
      setProcessingId(req.id);

      try {
          const batch = writeBatch(db);
          
          // 1. Update Request Status
          const depositRef = doc(db, 'deposits', req.id);
          batch.update(depositRef, { 
              status: targetStatus,
              processedAt: new Date().toISOString()
          });

          // 2. Update User Profile (Balance and History)
          const userRef = doc(db, 'users', userId);
          
          if (action === 'approve') {
              const tx: Transaction = {
                  id: `tx_dep_${req.id}_${Date.now()}`,
                  type: 'deposit',
                  amount: safeAmount,
                  date: new Date().toISOString().split('T')[0],
                  status: 'completed',
                  description: `Deposit Confirmed (${req.transactionId})`
              };
              
              // FIX: Use setDoc with merge to prevent "No document to update" error
              await setDoc(userRef, {
                  wallet: {
                      balance: increment(safeAmount),
                      pendingDeposit: increment(-safeAmount)
                  },
                  walletHistory: arrayUnion(tx)
              }, { merge: true });
          } else {
              // Just clear the pending tag if rejected
              await setDoc(userRef, {
                  wallet: {
                      pendingDeposit: increment(-safeAmount)
                  }
              }, { merge: true });
          }

          // 3. Create Notification for the Vendor
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
              userId: userId,
              title: action === 'approve' ? "Funds Added! 💰" : "Deposit Rejected ❌",
              message: action === 'approve' 
                ? `Your deposit of Rs. ${safeAmount} has been verified and added to your wallet.` 
                : `Your deposit request for Rs. ${safeAmount} was rejected by admin.`,
              type: action === 'approve' ? 'success' : 'error',
              isRead: false,
              createdAt: new Date().toISOString(),
              link: 'wallet-history'
          });

          await batch.commit();
          
          // Force a local sync for the UI
          window.dispatchEvent(new Event('wallet_updated'));
          alert(`✅ Successfully ${action}d the deposit for ${req.userName}.`);

      } catch (e: any) {
          console.error("Firestore error:", e);
          alert(`Permission Denied: Ensure you are logged in as an Admin and have updated the Rules in Firebase Console.\n\nError: ${e.message}`);
      } finally {
          setProcessingId(null);
      }
  };

  const handleDeleteDeposit = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this deposit request? This action cannot be undone.")) return;
      if (!db) return;
      try {
          await deleteDoc(doc(db, 'deposits', id));
          alert("Request deleted immediately.");
      } catch (e: any) {
          alert("Error deleting deposit: " + e.message);
      }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!db) return;
      setSavingSettings(true);
      try {
          await setDoc(doc(db, 'settings', 'payment_info'), paymentInfo);
          alert("✅ Payment settings updated!");
      } catch (e: any) {
          alert("Permission denied. Check Firestore rules.");
      }
      setSavingSettings(false);
  };

  return (
    <div className="min-h-screen pb-10">
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Finance Manager</h2>
        <p className="text-gray-500 dark:text-gray-400">Verify payments and manage platform revenue.</p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
              { id: 'deposits', label: 'Deposits', icon: '💰' },
              { id: 'withdrawals', label: 'Withdrawals', icon: '💸' },
              { id: 'settings', label: 'Config', icon: '⚙️' },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id 
                      ? 'border-primary text-primary dark:text-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                  <span>{tab.icon}</span> {tab.label}
              </button>
          ))}
      </div>

      {activeTab === 'deposits' && (
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg">Deposit Requests</h3>
                  <div className="flex gap-2">
                      <button onClick={() => setDepositFilter('pending')} className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${depositFilter === 'pending' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Pending</button>
                      <button onClick={() => setDepositFilter('all')} className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${depositFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>All History</button>
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Vendor</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Amount</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Transaction ID</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {deposits
                            .filter(d => depositFilter === 'all' || d.status === 'pending')
                            .map(req => (
                                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold dark:text-white">{req.userName}</div>
                                        <div className="text-[10px] text-gray-400">{req.date}</div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-green-600">Rs. {req.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">{req.transactionId}</div>
                                        {req.screenshotUrl && (
                                            <button onClick={() => setProofUrl(req.screenshotUrl || null)} className="block text-[10px] text-primary hover:underline mt-1">View Screenshot</button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            req.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                            req.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                                            'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => setConfirmModal({isOpen: true, type: 'deposit', action: 'approve', item: req})} 
                                                        disabled={processingId === req.id}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmModal({isOpen: true, type: 'deposit', action: 'reject', item: req})} 
                                                        disabled={processingId === req.id}
                                                        className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => handleDeleteDeposit(req.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded border border-red-100 shadow-sm transition-all"
                                                title="Delete Request"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                          {deposits.length === 0 && (
                              <tr><td colSpan={5} className="py-10 text-center text-gray-500">No deposit requests found.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700">
                  <div className="text-center mb-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.action === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {confirmModal.action === 'approve' ? '✅' : '❌'}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white capitalize">{confirmModal.action} this request?</h3>
                      <div className="text-sm text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                          <p>Vendor: <span className="font-bold text-gray-800 dark:text-gray-200">{confirmModal.item.userName}</span></p>
                          <p>Amount: <span className="font-bold text-primary">Rs. {confirmModal.item.amount.toLocaleString()}</span></p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all">Cancel</button>
                      <button 
                        onClick={executeProcessDeposit} 
                        className={`flex-1 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${confirmModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PROOF LIGHTBOX */}
      {proofUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4" onClick={() => setProofUrl(null)}>
              <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setProofUrl(null)} className="absolute -top-10 right-0 text-white text-3xl">✕</button>
                  <img src={proofUrl} className="w-full rounded-lg shadow-2xl" alt="Proof" />
              </div>
          </div>
      )}

    </div>
  );
};

export default ManageFinance;
