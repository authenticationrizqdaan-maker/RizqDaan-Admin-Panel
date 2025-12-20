
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, ChatConversation, AppNotification } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, limit, writeBatch } from 'firebase/firestore';

interface ChatPageProps {
  currentUser: User;
  targetUser: { id: string; name: string } | null;
  onNavigate: (view: 'home') => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ currentUser, targetUser, onNavigate }) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'messages' | 'alerts'>('messages');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (targetUser && db) {
        const sortedIds = [currentUser.id, targetUser.id].sort();
        const convId = `${sortedIds[0]}_${sortedIds[1]}`;
        setActiveConversationId(convId);
        setActiveTab('messages'); 
      }
    };
    initChat();
  }, [targetUser, currentUser.id]);

  useEffect(() => {
    if (!currentUser?.id || !db) {
        setLoadingChats(false);
        return;
    }

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatConversation));
      
      convs.sort((a, b) => {
          const tA = a.lastMessageTimestamp?.seconds || 0;
          const tB = b.lastMessageTimestamp?.seconds || 0;
          return tB - tA;
      });

      setConversations(convs);
      setLoadingChats(false);
    }, (err) => {
        if (!err.message.includes('permission')) console.error("Conversations error", err.message);
        setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
      if (!currentUser?.id || !db) return;
      setLoadingNotifs(true);

      const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setNotifications(data);
          setLoadingNotifs(false);
      }, (err) => {
          if (!err.message.includes('permission')) console.error("Chat alerts error", err.message);
          setLoadingNotifs(false);
      });

      return () => unsubscribe();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!activeConversationId || !db) return;

    const q = query(
      collection(db, `conversations/${activeConversationId}/messages`),
      orderBy('timestamp', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);

      const unreadIds = msgs
        .filter(m => !m.read && m.receiverId === currentUser.id)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        unreadIds.forEach(id => {
            const msgRef = doc(db, `conversations/${activeConversationId}/messages`, id);
            updateDoc(msgRef, { read: true }).catch(() => {});
        });

        const convRef = doc(db, 'conversations', activeConversationId);
        updateDoc(convRef, {
            [`unreadCounts.${currentUser.id}`]: 0
        }).catch(() => {});
      }
    }, (err) => {
        if (!err.message.includes('permission')) console.error("Messages error", err.message);
    });

    return () => unsubscribe();
  }, [activeConversationId, currentUser.id]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversationId || !db) return;

    const text = newMessage.trim();
    setNewMessage(''); 

    try {
        const parts = activeConversationId.split('_');
        const receiverId = parts[0] === currentUser.id ? parts[1] : parts[0];
        
        let receiverName = targetUser?.name || 'User';
        if (!targetUser) {
           const currentConv = conversations.find(c => c.id === activeConversationId);
           if (currentConv) {
               receiverName = currentConv.participantNames[receiverId] || 'User';
           }
        }

        await addDoc(collection(db, `conversations/${activeConversationId}/messages`), {
            text,
            senderId: currentUser.id,
            receiverId,
            timestamp: serverTimestamp(),
            read: false
        });

        const convRef = doc(db, 'conversations', activeConversationId);
        const currentConv = conversations.find(c => c.id === activeConversationId);
        const currentUnread = currentConv?.unreadCounts?.[receiverId] || 0;

        await setDoc(convRef, {
            participants: [currentUser.id, receiverId],
            participantNames: {
                [currentUser.id]: currentUser.name,
                [receiverId]: receiverName
            },
            lastMessage: text,
            lastMessageTimestamp: serverTimestamp(),
            unreadCounts: {
                [receiverId]: currentUnread + 1,
                [currentUser.id]: 0 
            }
        }, { merge: true });

    } catch (error: any) {
        console.error("Error sending message:", error.message);
    }
  };

  const handleMarkNotificationRead = async (notif: AppNotification) => {
      if(!notif.isRead && db) {
          const ref = doc(db, 'notifications', notif.id);
          await updateDoc(ref, { isRead: true }).catch(() => {});
      }
  };

  const getChatName = (conv: ChatConversation) => {
      const otherId = conv.participants.find(p => p !== currentUser.id);
      return otherId ? conv.participantNames[otherId] : 'Unknown';
  };

  const getTimeAgo = (isoString: string) => {
      const date = new Date(isoString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-82px)] md:h-[calc(100vh-140px)] bg-white dark:bg-dark-surface rounded-xl shadow-lg overflow-hidden animate-fade-in border border-gray-100 dark:border-gray-700">
      <div className={`w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-4">
           <div className="flex items-center gap-2">
               <button onClick={() => onNavigate('home')} className="md:hidden p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                   <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7 7-7" /></svg>
               </button>
               <h2 className="text-lg font-bold text-gray-800 dark:text-white">Communication</h2>
           </div>
           <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
               <button 
                onClick={() => setActiveTab('messages')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'messages' ? 'bg-white dark:bg-dark-surface shadow text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
               >
                   Messages
               </button>
               <button 
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'alerts' ? 'bg-white dark:bg-dark-surface shadow text-primary dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
               >
                   System Alerts
                   {notifications.some(n => !n.isRead) && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
               </button>
           </div>
        </div>
        
        <div className="flex-grow overflow-y-auto">
           {activeTab === 'messages' && (
                <>
                    {loadingChats ? (
                        <div className="flex justify-center p-4"><span className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></span></div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 mb-2">No conversations yet.</p>
                            <p className="text-xs text-gray-400">Go to a listing and click "Chat with Seller" to start.</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${activeConversationId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{getChatName(conv)}</span>
                                    {conv.lastMessageTimestamp && (
                                        <span className="text-xs text-gray-400">
                                            {new Date(conv.lastMessageTimestamp?.seconds * 1000).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex-grow pr-2">
                                        {conv.lastMessage}
                                    </p>
                                    {conv.unreadCounts?.[currentUser.id] > 0 && (
                                        <span className="bg-primary text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full flex-shrink-0">
                                            {conv.unreadCounts[currentUser.id]}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </>
           )}

           {activeTab === 'alerts' && (
               <div className="space-y-0">
                   {loadingNotifs ? (
                       <div className="flex justify-center p-4"><span className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></span></div>
                   ) : notifications.length === 0 ? (
                       <div className="p-8 text-center">
                           <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-3">
                               <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                           </div>
                           <p className="text-gray-500 text-sm">No new alerts.</p>
                       </div>
                   ) : (
                       notifications.map(notif => (
                           <div 
                                key={notif.id}
                                onClick={() => handleMarkNotificationRead(notif)}
                                className={`p-4 border-b border-gray-100 dark:border-gray-800 transition-colors cursor-pointer relative ${notif.isRead ? 'bg-white dark:bg-dark-surface' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}
                           >
                               <div className="flex items-start gap-3">
                                   <div className={`mt-1 p-1.5 rounded-full flex-shrink-0 ${
                                       notif.type === 'success' ? 'bg-green-100 text-green-600' :
                                       notif.type === 'error' ? 'bg-red-100 text-red-600' :
                                       notif.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                       'bg-blue-100 text-blue-600'
                                   }`}>
                                       {notif.type === 'success' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> :
                                        notif.type === 'error' || notif.type === 'warning' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> :
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                       }
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-start">
                                           <h4 className={`text-sm font-semibold mb-0.5 ${notif.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>{notif.title}</h4>
                                           {!notif.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>}
                                       </div>
                                       <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{notif.message}</p>
                                       <p className="text-[10px] text-gray-400 mt-2">{getTimeAgo(notif.createdAt)}</p>
                                   </div>
                               </div>
                           </div>
                       ))
                   )}
               </div>
           )}
        </div>
      </div>

      <div className={`w-full md:w-2/3 flex flex-col h-full ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeTab === 'alerts' && !activeConversationId ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center bg-gray-50/50 dark:bg-gray-900/50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-full mb-4 shadow-sm">
                    <svg className="w-16 h-16 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">System Notifications</h3>
                <p className="text-sm mt-2 max-w-sm">
                    Admin announcements and wallet updates appear in the alerts tab. Click on an alert to mark it as read.
                </p>
            </div>
        ) : activeConversationId ? (
            <>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center bg-gray-50 dark:bg-gray-800 flex-shrink-0 z-10">
                    <button onClick={() => setActiveConversationId(null)} className="md:hidden mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">
                            {targetUser?.name || (conversations.find(c => c.id === activeConversationId) ? getChatName(conversations.find(c => c.id === activeConversationId)!) : 'Chat')}
                        </h3>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-100 dark:bg-gray-900 flex flex-col">
                    {messages.map(msg => {
                        const isMe = msg.senderId === currentUser.id;
                        const timestamp = msg.timestamp 
                            ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : '...';

                        return (
                            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`relative max-w-[85%] sm:max-w-[70%] px-3 pt-2 pb-6 rounded-xl shadow-sm min-w-[80px] ${
                                    isMe 
                                    ? 'bg-primary text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-600'
                                }`}>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed pb-1 pr-2">{msg.text}</p>
                                    <div className={`absolute bottom-1 right-2 flex items-center gap-1 select-none`}>
                                        <span className={`text-[10px] ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>
                                            {timestamp}
                                        </span>
                                        {isMe && (
                                             <span className={`${msg.read ? 'text-blue-300' : 'text-gray-400'}`}>
                                                {msg.read ? (
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M0.41 13.41L6 19l1.41-1.41L1.83 12 0.41 13.41zm22.24-9.06l-12 12L9.07 14.83 7.66 16.24 10.66 19.24 24.07 5.76 22.65 4.35zM18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7z" /></svg>
                                                ) : (
                                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                                )}
                                             </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 pr-4 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0 items-center">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow min-w-0 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 dark:bg-gray-800 dark:text-white shadow-inner"
                    />
                    <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-white w-12 h-12 rounded-full hover:bg-primary-dark disabled:opacity-50 transition-all shadow-md flex items-center justify-center flex-shrink-0 active:scale-95">
                        <svg className="w-5 h-5 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </form>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Select a Conversation</h3>
                <p className="text-sm mt-2 max-w-xs">Choose a chat from the left menu or visit a listing to contact a seller.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
