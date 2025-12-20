
import React, { useState, useEffect } from 'react';
import { User, Listing, Transaction, AppNotification } from '../../types';
import { db, auth } from '../../firebaseConfig';
import { doc, deleteDoc, updateDoc, arrayUnion, addDoc, collection, setDoc, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData, where } from 'firebase/firestore';

interface ManageUsersProps {
  users: User[]; // This prop can now serve as initial data or be ignored
  listings: Listing[];
  onUpdateUserVerification: (userId: string, isVerified: boolean) => void;
  onImpersonate: (user: User) => void;
}

const ManageUsers: React.FC<ManageUsersProps> = ({ users: initialUsers, listings, onUpdateUserVerification, onImpersonate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified' | 'banned'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null); 
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<User>>>({});

  const fetchUsers = async (isNext = false) => {
      if (!db || loading || (!hasMore && isNext)) return;
      setLoading(true);
      
      try {
          let q = query(
              collection(db, 'users'),
              orderBy('name', 'asc'),
              limit(20)
          );

          if (isNext && lastDoc) {
              q = query(q, startAfter(lastDoc));
          }

          const snapshot = await getDocs(q);
          const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          
          if (snapshot.docs.length < 20) setHasMore(false);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);

          if (isNext) {
              setUsers(prev => [...prev, ...fetchedUsers]);
          } else {
              setUsers(fetchedUsers);
          }
      } catch (e) {
          console.error("User fetch error:", e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchUsers();
  }, []);

  // Filter local logic for UI feedback
  const filteredVendors = users.filter(u => {
      if (u.isAdmin) return false;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
          (u.name?.toLowerCase() || '').includes(searchLower) ||
          (u.email?.toLowerCase() || '').includes(searchLower) ||
          (u.phone?.toLowerCase() || '').includes(searchLower)
      );
      const matchesStatus = 
          filterStatus === 'all' ? true :
          filterStatus === 'verified' ? u.isVerified :
          filterStatus === 'unverified' ? !u.isVerified :
          filterStatus === 'banned' ? u.isBanned : true;
      return matchesSearch && matchesStatus;
  });

  const updateLocalUser = (userId: string, data: Partial<User>) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      if (selectedUser && selectedUser.id === userId) {
          setSelectedUser(prev => prev ? { ...prev, ...data } : null);
      }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("⚠️ DANGER: Permanent Delete?")) {
      if (db) {
        try {
            await deleteDoc(doc(db, "users", userId));
            setUsers(prev => prev.filter(u => u.id !== userId));
            setSelectedUser(null);
        } catch(e: any) {
            alert("Delete failed: " + e.message);
        }
      }
    }
  };

  const handleToggleBan = async (user: User) => {
      const newBanStatus = !user.isBanned;
      if (db) {
          try { 
              await setDoc(doc(db, "users", user.id), { isBanned: newBanStatus }, { merge: true }); 
              updateLocalUser(user.id, { isBanned: newBanStatus });
          } catch (e: any) { alert(e.message); }
      }
  };

  const handleToggleVerify = async (user: User) => {
      const newStatus = !user.isVerified;
      if (db) {
          try { 
              await setDoc(doc(db, "users", user.id), { isVerified: newStatus }, { merge: true }); 
              updateLocalUser(user.id, { isVerified: newStatus });
              onUpdateUserVerification(user.id, newStatus);
          } catch (e: any) { alert(e.message); }
      }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Manage Users</h2>
            <p className="text-sm text-gray-500">Showing {users.length} users</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:text-white text-sm">
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="unverified">Pending</option>
                <option value="banned">Banned</option>
            </select>
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-sm outline-none" />
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-dark-surface rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-primary dark:bg-gray-800 text-white">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Identity</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase">Status</th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredVendors.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center font-bold text-gray-500">
                            {user.profilePictureUrl ? <img src={user.profilePictureUrl} className="h-full w-full object-cover" alt="" /> : (user.name?.charAt(0) || 'U')}
                        </div>
                        <div className="ml-3">
                            <div className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${user.isBanned ? 'bg-red-100 text-red-600' : user.isVerified ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                        {user.isBanned ? 'Banned' : user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button onClick={() => setSelectedUser(user)} className="text-primary hover:underline font-medium text-sm">Manage</button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
        {hasMore && (
            <div className="p-4 flex justify-center">
                <button 
                    onClick={() => fetchUsers(true)}
                    disabled={loading}
                    className="text-primary font-bold text-sm hover:underline"
                >
                    {loading ? 'Loading...' : 'Load More Users ↓'}
                </button>
            </div>
        )}
      </div>

      {selectedUser && (
          <UserDetailModal 
            user={selectedUser} 
            userListings={[]} // Optimized: Details can be fetched if needed
            onClose={() => setSelectedUser(null)}
            onImpersonate={onImpersonate}
            onToggleVerify={handleToggleVerify}
            onToggleBan={handleToggleBan}
            onDeleteUser={handleDelete}
          />
      )}
    </div>
  );
};

const UserDetailModal: React.FC<{ user: User; userListings: Listing[]; onClose: () => void; onImpersonate: (u: User) => void; onToggleVerify: (u: User) => void; onToggleBan: (u: User) => void; onDeleteUser: (id: string) => void; }> = ({ 
    user, userListings, onClose, onImpersonate, onToggleVerify, onToggleBan, onDeleteUser 
}) => {
    const [fundAmount, setFundAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const balance = user.wallet?.balance || 0;

    const handleFundTransaction = async (type: 'deposit' | 'penalty') => {
        const amount = parseFloat(fundAmount);
        if (isNaN(amount) || amount <= 0 || !db) return;
        setIsProcessing(true);
        try {
            const newBalance = type === 'deposit' ? balance + amount : balance - amount;
            await setDoc(doc(db, 'users', user.id), {
                wallet: { balance: newBalance },
                walletHistory: arrayUnion({
                    id: `tx_admin_${Date.now()}`,
                    type: 'adjustment',
                    amount,
                    date: new Date().toISOString().split('T')[0],
                    status: 'completed',
                    description: `Admin ${type === 'deposit' ? 'Credit' : 'Debit'}`
                })
            }, { merge: true });
            alert("Done!");
            setFundAmount('');
            window.dispatchEvent(new Event('wallet_updated'));
        } catch(e: any) { alert(e.message); }
        finally { setIsProcessing(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="text-xl font-bold dark:text-white truncate pr-4">{user.shopName || user.name}</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">✕</button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Balance</p>
                            <p className="text-xl font-bold dark:text-white text-primary">Rs. {balance.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Adjust Wallet</label>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="number" 
                                value={fundAmount} 
                                onChange={e => setFundAmount(e.target.value)} 
                                className="w-full px-4 py-3 border rounded-xl dark:bg-gray-700 dark:text-white" 
                                placeholder="Amount..." 
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleFundTransaction('deposit')} disabled={isProcessing} className="px-4 py-3 bg-green-600 text-white rounded-xl font-bold">Add Credit</button>
                                <button onClick={() => handleFundTransaction('penalty')} disabled={isProcessing} className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold">Debit</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => onToggleVerify(user)} className={`p-3 border rounded-xl text-sm font-bold ${user.isVerified ? 'border-green-500 text-green-600' : 'border-gray-300'}`}>{user.isVerified ? '✓ Verified' : 'Verify'}</button>
                            <button onClick={() => onToggleBan(user)} className={`p-3 border rounded-xl text-sm font-bold ${user.isBanned ? 'bg-red-600 text-white' : 'border-red-200 text-red-500'}`}>{user.isBanned ? 'Unban' : 'Ban User'}</button>
                        </div>
                        <button onClick={() => onImpersonate(user)} className="w-full p-3 bg-gray-800 text-white rounded-xl font-bold">Login as User</button>
                        <button onClick={() => onDeleteUser(user.id)} className="w-full p-3 text-red-600 font-bold border border-red-200 rounded-xl">Delete Account</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageUsers;
