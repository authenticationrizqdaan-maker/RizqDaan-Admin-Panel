
import React, { useState, useEffect } from 'react';
import { User, Transaction, DepositRequest, PaymentInfo } from '../../types';
import { db } from '../../firebaseConfig';
import { doc, collection, onSnapshot, setDoc, increment, writeBatch, arrayUnion, deleteDoc } from 'firebase/firestore';

interface ManageFinanceProps {
  users: User[];
}

const ManageFinance: React.FC<ManageFinanceProps> = ({ users }) => {
  const [activeTab, setActiveTab] = useState<'deposits' | 'settings'>('deposits'); 
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [depositFilter, setDepositFilter] = useState<'pending' | 'all'>('pending');
  const [proofUrl, setProofUrl] = useState<string | null>(null); 

  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      type: 'deposit';
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
      
      const unsubDeposits = onSnapshot(collection(db, 'deposits'), (snap) => {
          setDeposits(snap.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
      }, (err) => {
          if (!err.message.includes('permission')) console.error("Deposits listen error", err.message);
      });

      const unsubSettings = onSnapshot(doc(db, 'settings', 'payment_info'), (snap) => {
          if (snap.exists()) setPaymentInfo(snap.data() as PaymentInfo);
      }, (err) => {
          console.log("Settings fetch error:", err.message);
      });

      return () => {
          unsubDeposits();
          unsubSettings();
      };
  }, []);

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
          
          const depositRef = doc(db, 'deposits', req.id);
          batch.update(depositRef, { 
              status: targetStatus,
              processedAt: new Date().toISOString()
          });

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
              
              await setDoc(userRef, {
                  wallet: {
                      balance: increment(safeAmount),
                      pendingDeposit: increment(-safeAmount)
                  },
                  walletHistory: arrayUnion(tx)
              }, { merge: true });
          } else {
              await setDoc(userRef, {
                  wallet: {
                      pendingDeposit: increment(-safeAmount)
                  }
              }, { merge: true });
          }

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
          window.dispatchEvent(new Event('wallet_updated'));
          alert(`✅ Successfully ${action}d the deposit for ${req.userName}.`);
      } catch (e: any) {
          alert(`Error: ${e.message}`);
      } finally {
          setProcessingId(null);
      }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!db) return;
      setSavingSettings(true);
      try {
          await setDoc(doc(db, 'settings', 'payment_info'), paymentInfo, { merge: true });
          localStorage.setItem('admin_payment_info', JSON.stringify(paymentInfo));
          window.dispatchEvent(new Event('payment_info_updated'));
          alert("✅ Payment settings updated successfully!");
      } catch (e: any) {
          alert("Error: " + e.message);
      }
      setSavingSettings(false);
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Finance Manager</h2>
        <p className="text-gray-500 dark:text-gray-400">Manage vendor payments and account settings.</p>
      </div>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          {[
              { id: 'deposits', label: 'Deposits', icon: '💰' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-8 py-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id 
                      ? 'border-primary text-primary dark:text-white bg-gray-50 dark:bg-gray-800/50' 
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
                      <button onClick={() => setDepositFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${depositFilter === 'pending' ? 'bg-primary text-white shadow' : 'bg-gray-200 text-gray-500'}`}>Pending</button>
                      <button onClick={() => setDepositFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${depositFilter === 'all' ? 'bg-primary text-white shadow' : 'bg-gray-200 text-gray-500'}`}>All History</button>
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
                                            <button onClick={() => setProofUrl(req.screenshotUrl || null)} className="block text-[10px] text-primary hover:underline mt-1 font-bold">View Screenshot</button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                            req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                            req.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                            'bg-yellow-50 text-yellow-700 border-yellow-200'
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
                                                        disabled={!!processingId}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmModal({isOpen: true, type: 'deposit', action: 'reject', item: req})} 
                                                        disabled={!!processingId}
                                                        className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={async () => { if(window.confirm("Delete request?")) await deleteDoc(doc(db, 'deposits', req.id)); }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded border border-gray-100 hover:border-red-100 shadow-sm transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                          {deposits.length === 0 && (
                              <tr><td colSpan={5} className="py-16 text-center text-gray-400 font-medium">No deposit requests to display.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <h3 className="font-bold text-gray-800 dark:text-white text-lg">Platform Payment Settings</h3>
                      <p className="text-sm text-gray-500 mt-1">Vendors will see these details when adding funds to their wallet.</p>
                  </div>
                  
                  <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Bank / Method Name</label>
                              <input 
                                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                                  value={paymentInfo.bankName} 
                                  onChange={e => setPaymentInfo({...paymentInfo, bankName: e.target.value})} 
                                  placeholder="e.g. JazzCash or Bank Transfer"
                                  required
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Account Title</label>
                              <input 
                                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                                  value={paymentInfo.accountTitle} 
                                  onChange={e => setPaymentInfo({...paymentInfo, accountTitle: e.target.value})} 
                                  placeholder="Full Name on Account"
                                  required
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Account Number / IBAN</label>
                          <input 
                              className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-lg tracking-wider focus:ring-2 focus:ring-primary outline-none" 
                              value={paymentInfo.accountNumber} 
                              onChange={e => setPaymentInfo({...paymentInfo, accountNumber: e.target.value})} 
                              placeholder="03001234567"
                              required
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Instructions for Vendor</label>
                          <textarea 
                              className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24 focus:ring-2 focus:ring-primary outline-none resize-none" 
                              value={paymentInfo.instructions} 
                              onChange={e => setPaymentInfo({...paymentInfo, instructions: e.target.value})} 
                              placeholder="Step-by-step guide for the vendor..."
                          />
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                          <label className="block text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-1">Custom Note / Alert Message</label>
                          <input 
                              className="w-full p-3 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-800 rounded-xl dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none" 
                              value={paymentInfo.customNote || ''} 
                              onChange={e => setPaymentInfo({...paymentInfo, customNote: e.target.value})} 
                              placeholder="e.g. 'Holiday Notice: Verification will take 24 hours' (Optional)"
                          />
                          <p className="text-[10px] text-yellow-600 mt-2">This note appears as a prominent alert at the top of the Add Funds screen.</p>
                      </div>

                      <div className="pt-4 flex justify-end">
                          <button 
                              type="submit" 
                              disabled={savingSettings}
                              className="px-12 py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all transform active:scale-95 flex items-center gap-2"
                          >
                              {savingSettings ? (
                                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                              ) : (
                                  "Save Payment Configuration"
                              )}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* LIGHTBOX & MODALS */}
      {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-2xl max-w-sm w-full border dark:border-gray-700 animate-fade-in">
                  <div className="text-center mb-6">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.action === 'approve' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {confirmModal.action === 'approve' ? '✅' : '❌'}
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white capitalize">{confirmModal.action} this request?</h3>
                      <div className="text-sm text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-1">
                          <p>Vendor: <span className="font-bold text-gray-800 dark:text-gray-200">{confirmModal.item.userName}</span></p>
                          <p>Amount: <span className="font-bold text-primary">Rs. {confirmModal.item.amount.toLocaleString()}</span></p>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={() => setConfirmModal(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold">Cancel</button>
                      <button 
                        onClick={executeProcessDeposit} 
                        className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-all ${confirmModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {proofUrl && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4" onClick={() => setProofUrl(null)}>
              <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setProofUrl(null)} className="absolute -top-12 right-0 text-white p-2 hover:text-gray-300">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <img src={proofUrl} className="w-full rounded-lg shadow-2xl border-2 border-white/10" alt="Proof" />
              </div>
          </div>
      )}
    </div>
  );
};

export default ManageFinance;
