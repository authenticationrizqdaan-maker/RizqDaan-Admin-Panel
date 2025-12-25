
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query, getDoc } from 'firebase/firestore';
import { HelpCategory, HelpTopic, AppSettings } from '../../types';

const ManageHelpCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'topics' | 'support'>('categories');
    const [categories, setCategories] = useState<HelpCategory[]>([]);
    const [topics, setTopics] = useState<HelpTopic[]>([]);
    const [loading, setLoading] = useState(true);

    // Support Info State
    const [supportInfo, setSupportInfo] = useState({
        whatsapp: '',
        email: ''
    });
    const [savingSupport, setSavingSupport] = useState(false);

    // Form States
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [catForm, setCatForm] = useState<Omit<HelpCategory, 'id'>>({ title: '', icon: '❓', order: 1, isActive: true });
    const [topicForm, setTopicForm] = useState<Omit<HelpTopic, 'id'>>({ categoryId: '', title: '', content: '', order: 1, isActive: true });

    useEffect(() => {
        if (!db) return;
        
        // Listen to Categories
        const unsubCats = onSnapshot(query(collection(db, 'help_categories')), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HelpCategory));
            data.sort((a, b) => a.order - b.order);
            setCategories(data);
        });

        // Listen to Topics
        const unsubTopics = onSnapshot(query(collection(db, 'help_topics')), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HelpTopic));
            data.sort((a, b) => a.order - b.order);
            setTopics(data);
            setLoading(false);
        });

        // Fetch Support Info from System Settings
        const fetchSupport = async () => {
            const docSnap = await getDoc(doc(db, 'settings', 'system'));
            if (docSnap.exists()) {
                const data = docSnap.data();
                setSupportInfo({
                    whatsapp: data.supportWhatsapp || '',
                    email: data.supportEmail || ''
                });
            }
        };
        fetchSupport();

        return () => { unsubCats(); unsubTopics(); };
    }, []);

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await setDoc(doc(db, 'help_categories', isEditing), catForm, { merge: true });
            } else {
                await addDoc(collection(db, 'help_categories'), catForm);
            }
            setCatForm({ title: '', icon: '❓', order: categories.length + 1, isActive: true });
            setIsEditing(null);
        } catch (e: any) { alert(e.message); }
    };

    const handleSaveTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicForm.categoryId) { alert("Select a category"); return; }
        try {
            if (isEditing) {
                await setDoc(doc(db, 'help_topics', isEditing), topicForm, { merge: true });
            } else {
                await addDoc(collection(db, 'help_topics'), topicForm);
            }
            setTopicForm({ ...topicForm, title: '', content: '', order: topics.length + 1 });
            setIsEditing(null);
        } catch (e: any) { alert(e.message); }
    };

    const handleSaveSupportInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingSupport(true);
        try {
            await setDoc(doc(db, 'settings', 'system'), {
                supportWhatsapp: supportInfo.whatsapp,
                supportEmail: supportInfo.email
            }, { merge: true });
            alert("✅ Support Contact Info Updated!");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setSavingSupport(false);
        }
    };

    const handleDelete = async (col: string, id: string) => {
        if (window.confirm("Delete this permanently?")) {
            await deleteDoc(doc(db, col, id));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Manage Help Center</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
                    <button 
                        onClick={() => { setActiveTab('categories'); setIsEditing(null); }}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}
                    >
                        Level 1: Categories
                    </button>
                    <button 
                        onClick={() => { setActiveTab('topics'); setIsEditing(null); }}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'topics' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}
                    >
                        Level 2/3: Content
                    </button>
                    <button 
                        onClick={() => { setActiveTab('support'); setIsEditing(null); }}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'support' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}
                    >
                        Support Info 📞
                    </button>
                </div>
            </div>

            {/* TAB 1: CATEGORY MANAGEMENT */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">{isEditing ? 'Edit Category' : 'New Category'}</h3>
                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <input placeholder="Title (e.g. Payments)" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={catForm.title} onChange={e => setCatForm({...catForm, title: e.target.value})} required />
                            <div className="flex gap-2">
                                <input placeholder="Emoji" className="w-20 p-2 border rounded text-center text-xl dark:bg-gray-700" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} maxLength={2} />
                                <input type="number" placeholder="Order" className="flex-grow p-2 border rounded dark:bg-gray-700 dark:text-white" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} />
                            </div>
                            <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                                <input type="checkbox" checked={catForm.isActive} onChange={e => setCatForm({...catForm, isActive: e.target.checked})} />
                                Category is Live
                            </label>
                            <button type="submit" className="w-full py-2 bg-primary text-white font-bold rounded-lg">{isEditing ? 'Update' : 'Add Level 1'}</button>
                            {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="w-full text-sm text-gray-500 mt-2">Cancel Edit</button>}
                        </form>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{cat.icon}</span>
                                    <div>
                                        <h4 className="font-bold dark:text-white">{cat.title}</h4>
                                        <p className="text-xs text-gray-500">Order: {cat.order} • {cat.isActive ? 'Active' : 'Disabled'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setIsEditing(cat.id); setCatForm(cat); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                                    <button onClick={() => handleDelete('help_categories', cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: TOPIC MANAGEMENT */}
            {activeTab === 'topics' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit sticky top-6">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">{isEditing ? 'Edit Topic' : 'New Topic'}</h3>
                        <form onSubmit={handleSaveTopic} className="space-y-4">
                            <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.categoryId} onChange={e => setTopicForm({...topicForm, categoryId: e.target.value})} required>
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                            <input placeholder="Question / Title" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} required />
                            <textarea placeholder="Detailed Answer..." className="w-full p-2 border rounded h-40 dark:bg-gray-700 dark:text-white text-sm" value={topicForm.content} onChange={e => setTopicForm({...topicForm, content: e.target.value})} required />
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Order</label>
                                    <input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.order} onChange={e => setTopicForm({...topicForm, order: Number(e.target.value)})} />
                                </div>
                                <div className="pt-5">
                                    <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                                        <input type="checkbox" checked={topicForm.isActive} onChange={e => setTopicForm({...topicForm, isActive: e.target.checked})} />
                                        Is Live
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-2 bg-primary text-white font-bold rounded-lg shadow-md">{isEditing ? 'Update Topic' : 'Publish Topic'}</button>
                            {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="w-full text-sm text-gray-500 mt-2">Cancel Edit</button>}
                        </form>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {categories.map(cat => (
                            <div key={cat.id} className="bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3 px-2 flex items-center gap-2">
                                    <span>{cat.icon}</span> {cat.title} Topics
                                </h4>
                                <div className="space-y-2">
                                    {topics.filter(t => t.categoryId === cat.id).map(topic => (
                                        <div key={topic.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <div className="flex-grow">
                                                <h5 className="font-bold dark:text-white text-sm">{topic.title}</h5>
                                                <p className="text-[10px] text-gray-400 truncate max-w-[250px]">{topic.content}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setIsEditing(topic.id); setTopicForm(topic); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                                                <button onClick={() => handleDelete('help_topics', topic.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: SUPPORT CONTACT INFO */}
            {activeTab === 'support' && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.407 3.481 2.239 2.24 3.477 5.23 3.475 8.411-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.394 1.664zm6.222-3.528c1.552.92 3.51 1.405 5.621 1.406 5.543 0 10.054-4.51 10.057-10.055.002-2.686-1.047-5.212-2.952-7.118-1.904-1.905-4.432-2.952-7.118-2.952-5.544 0-10.054 4.51-10.057 10.055-.001 2.112.553 4.17 1.602 5.962l-.999 3.649 3.846-.947zm11.387-5.477c-.31-.156-1.834-.905-2.113-1.006-.279-.101-.482-.151-.684.151-.202.302-.782 1.006-.958 1.207-.176.202-.352.227-.662.071-.31-.156-1.311-.484-2.498-1.543-.923-.824-1.547-1.841-1.728-2.143-.181-.303-.019-.466.136-.621.14-.14.31-.362.466-.543.156-.181.208-.31.31-.517.103-.207.052-.387-.026-.543-.078-.156-.684-1.649-.938-2.261-.247-.597-.499-.516-.684-.525-.176-.008-.378-.009-.58-.009s-.53.076-.807.378c-.278.302-1.061 1.037-1.061 2.531s1.087 2.946 1.239 3.148c.152.202 2.139 3.267 5.182 4.581.724.312 1.288.499 1.728.639.728.231 1.389.198 1.912.12.583-.087 1.834-.751 2.09-1.477.256-.725.256-1.348.179-1.477-.076-.128-.278-.204-.588-.36z"/></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Help Center Button Info</h3>
                        <p className="text-gray-500 text-sm mb-8">This information is used for the "Contact Support" button in the User App Help Center.</p>
                        
                        <form onSubmit={handleSaveSupportInfo} className="space-y-6 text-left">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">WhatsApp Support Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">+</span>
                                    <input 
                                        type="tel" 
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white font-bold"
                                        placeholder="923xxxxxxxxx"
                                        value={supportInfo.whatsapp}
                                        onChange={e => setSupportInfo({...supportInfo, whatsapp: e.target.value})}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">Enter country code first, no spaces or plus (e.g. 923265520658).</p>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Support Email Address</label>
                                <input 
                                    type="email" 
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white"
                                    placeholder="support@rizqdaan.com"
                                    value={supportInfo.email}
                                    onChange={e => setSupportInfo({...supportInfo, email: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={savingSupport}
                                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {savingSupport ? (
                                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                                ) : "Update Support Contact Info"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageHelpCenter;
