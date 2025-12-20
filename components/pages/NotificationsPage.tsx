
import React, { useState, useEffect } from 'react';
import { User, AppNotification } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';

interface NotificationsPageProps {
  user: User;
  onNavigate: (view: string) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ user, onNavigate }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for notifications
  useEffect(() => {
      if (!db || !user) return;

      const q = query(
          collection(db, 'notifications'), 
          where('userId', '==', user.id)
          // Removed orderBy('createdAt') to fix index error. Sorting client-side instead.
      );

      const unsubscribe = onSnapshot(q, (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
          
          // Client-side sort: Newest first
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setNotifications(data);
          setLoading(false);
      }, (err) => {
          console.error("Notif error", err.message);
          setLoading(false);
      });

      return () => unsubscribe();
  }, [user]);

  const handleMarkAllRead = async () => {
      if (!db) return;
      const batch = writeBatch(db);
      notifications.forEach(n => {
          if (!n.isRead) {
              const ref = doc(db, 'notifications', n.id);
              batch.update(ref, { isRead: true });
          }
      });
      await batch.commit();
  };

  const handleNotificationClick = async (notif: AppNotification) => {
      // 1. Mark as read
      if (!notif.isRead && db) {
          await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      }
      
      // 2. Navigate if link exists
      if (notif.link) {
          onNavigate(notif.link);
      }
  };

  const getIcon = (type: string) => {
      switch (type) {
          case 'success': return <div className="p-2 bg-green-100 text-green-600 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
          case 'warning': return <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>;
          case 'error': return <div className="p-2 bg-red-100 text-red-600 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
          default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
      }
  };

  // Time formatter
  const getTimeAgo = (isoString: string) => {
      const date = new Date(isoString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`;
      return date.toLocaleDateString();
  };

  return (
    <div className="animate-fade-in pb-20">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
            <button onClick={() => onNavigate('home')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">Notifications</h1>
        </div>
        {notifications.length > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm text-primary hover:underline font-medium">Mark all read</button>
        )}
      </header>

      {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Notifications</h3>
              <p className="text-gray-500 text-sm mt-1">You're all caught up! Updates will appear here.</p>
          </div>
      ) : (
          <div className="space-y-3">
              {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-colors border ${
                        notif.isRead 
                        ? 'bg-white dark:bg-dark-surface border-gray-100 dark:border-gray-700' 
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'
                    }`}
                  >
                      <div className="flex-shrink-0 mt-1">
                          {getIcon(notif.type)}
                      </div>
                      <div className="flex-grow">
                          <div className="flex justify-between items-start">
                              <h4 className={`font-semibold text-sm ${notif.isRead ? 'text-gray-800 dark:text-white' : 'text-gray-900 dark:text-white font-bold'}`}>
                                  {notif.title}
                              </h4>
                              <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{getTimeAgo(notif.createdAt)}</span>
                          </div>
                          <p className={`text-sm mt-1 ${notif.isRead ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notif.message}
                          </p>
                          {notif.link && (
                              <div className="mt-2 text-xs font-medium text-primary flex items-center">
                                  View Details <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                          )}
                      </div>
                      {!notif.isRead && (
                          <div className="flex-shrink-0 self-center">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default NotificationsPage;
