
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { User, Listing } from './types';
import AdminPanel from './components/admin/AdminPanel';
import AuthPage from './components/auth/AuthPage';

const AdminApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
            const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
            const userData = docSnap.data() as User;
            
            if (userData?.isAdmin) {
              setUser({ id: firebaseUser.uid, ...userData });
            } else {
              await signOut(auth);
              alert("Access Denied: You do not have administrator privileges.");
              setUser(null);
            }
        } catch (e) {
            console.error("Verification error", e);
            setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // Admin Data Listeners (Only active when logged in as admin)
  useEffect(() => {
    if (!user?.isAdmin || !db) return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });

    const unsubListings = onSnapshot(collection(db, "listings"), (snap) => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
    });

    return () => { unsubUsers(); unsubListings(); };
  }, [user]);

  const handleUpdateVerification = async (userId: string, isVerified: boolean) => {
      if (!db) return;
      try {
          await updateDoc(doc(db, "users", userId), { isVerified });
      } catch (e: any) {
          alert("Update failed: " + e.message);
      }
  };

  const handleDeleteListing = async (listingId: string) => {
      if (!window.confirm("Permanently delete this listing?")) return;
      if (!db) return;
      try {
          await deleteDoc(doc(db, "listings", listingId));
      } catch (e: any) {
          alert("Delete failed: " + e.message);
      }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-primary">
       <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
           <p className="text-white font-bold tracking-widest">RIZQDAAN ADMIN</p>
       </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
        <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-4xl font-black text-primary">RizqDaan</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Administrator Portal</p>
        </div>
        <div className="w-full max-w-md">
            <AuthPage 
                onLogin={async (email, password) => {
                    try {
                        await signInWithEmailAndPassword(auth, email, password);
                        return { success: true, message: 'Verifying...' };
                    } catch (e: any) {
                        return { success: false, message: e.message };
                    }
                }}
                onSignup={async () => ({ success: false, message: 'Public signups are disabled for the Admin App. Please use the Client App to create a user account first.' })}
                onVerifyAndLogin={() => {}}
            />
        </div>
        <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest">Secure Access Only</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
          <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-xs">RD</div>
                  <h1 className="text-lg font-bold text-gray-800 hidden sm:block">Admin Console</h1>
              </div>
              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-gray-800">{user.name}</p>
                      <p className="text-[10px] text-green-600 font-bold uppercase">System Admin</p>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors border border-red-100"
                  >
                    LOGOUT
                  </button>
              </div>
          </div>
      </div>

      <div className="container mx-auto p-4 md:p-8">
        <AdminPanel 
          users={users} 
          listings={listings} 
          onUpdateUserVerification={handleUpdateVerification} 
          onDeleteListing={handleDeleteListing}
          onImpersonate={() => alert("Impersonation restricted in this build version.")}
          onNavigate={() => {}}
        />
      </div>
    </div>
  );
};

export default AdminApp;
