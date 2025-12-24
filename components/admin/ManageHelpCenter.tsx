
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, query } from 'firebase/firestore';
import { HelpCategory, HelpTopic } from '../../types';

const ManageHelpCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'topics'>('categories');
    const [categories, setCategories] = useState<HelpCategory[]>([]);
    const [topics, setTopics] = useState<HelpTopic[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [catForm, setCatForm] = useState<Omit<HelpCategory, 'id'>>({ title: '', icon: '❓', order: 1, isActive: true });
    const [topicForm, setTopicForm] = useState<Omit<HelpTopic, 'id'>>({ categoryId: '', title: '', content: '', order: 1, isActive: true });

    useEffect(() => {
        if (!db) return;
        const unsubCats = onSnapshot(query(collection(db, 'help_categories')), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HelpCategory));
            data.sort((a, b) => a.order - b.order);
            setCategories(data);
        });

        const unsubTopics = onSnapshot(query(collection(db, 'help_topics')), (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as HelpTopic));
            data.sort((a, b) => a.order - b.order);
            setTopics(data);
            setLoading(false);
        });

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

    const handleDelete = async (col: string, id: string) => {
        if (window.confirm("Delete this permanently?")) {
            await deleteDoc(doc(db, col, id));
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Manage Help Center</h2>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button 
                        onClick={() => { setActiveTab('categories'); setIsEditing(null); }}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'categories' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}
                    >
                        Level 1: Main Points
                    </button>
                    <button 
                        onClick={() => { setActiveTab('topics'); setIsEditing(null); }}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'topics' ? 'bg-white dark:bg-dark-surface shadow text-primary' : 'text-gray-500'}`}
                    >
                        Level 2/3: Topics & Content
                    </button>
                </div>
            </div>

            {/* CATEGORY MANAGEMENT */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">{isEditing ? 'Edit Category' : 'New Category'}</h3>
                        <form onSubmit={handleSaveCategory} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Title</label>
                                <input placeholder="e.g. Payments Help" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={catForm.title} onChange={e => setCatForm({...catForm, title: e.target.value})} required />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Emoji Icon</label>
                                    <input placeholder="Emoji" className="w-full p-2 border rounded text-center text-xl dark:bg-gray-700" value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} maxLength={2} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-400 mb-1">Order</label>
                                    <input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={catForm.order} onChange={e => setCatForm({...catForm, order: Number(e.target.value)})} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm dark:text-gray-300">
                                <input type="checkbox" checked={catForm.isActive} onChange={e => setCatForm({...catForm, isActive: e.target.checked})} />
                                Category is Live
                            </label>
                            <button type="submit" className="w-full py-2 bg-primary text-white font-bold rounded-lg">{isEditing ? 'Update' : 'Add Category'}</button>
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

            {/* TOPIC MANAGEMENT */}
            {activeTab === 'topics' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-fit sticky top-6">
                        <h3 className="font-bold text-lg mb-4 dark:text-white">{isEditing ? 'Edit Topic' : 'New Topic'}</h3>
                        <form onSubmit={handleSaveTopic} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Parent Category</label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.categoryId} onChange={e => setTopicForm({...topicForm, categoryId: e.target.value})} required>
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Topic Title (Question)</label>
                                <input placeholder="How to pay?" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1">Detailed Content (Answer)</label>
                                <textarea placeholder="Write full instructions here..." className="w-full p-2 border rounded h-40 dark:bg-gray-700 dark:text-white text-sm" value={topicForm.content} onChange={e => setTopicForm({...topicForm, content: e.target.value})} required />
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Order</label>
                                    <input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" value={topicForm.order} onChange={e => setTopicForm({...topicForm, order: Number(e.target.value)})} />
                                </div>
                                <div className="pt-5">
                                    <label className="flex items-center gap-2 text-sm dark:text-gray-300 font-bold">
                                        <input type="checkbox" checked={topicForm.isActive} onChange={e => setTopicForm({...topicForm, isActive: e.target.checked})} />
                                        Is Live
                                    </label>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-primary text-white font-bold rounded-lg shadow-md">{isEditing ? 'Update Topic' : 'Publish Topic'}</button>
                            {isEditing && <button type="button" onClick={() => setIsEditing(null)} className="w-full text-sm text-gray-500 mt-2">Cancel Edit</button>}
                        </form>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {categories.map(cat => (
                            <div key={cat.id} className="bg-gray-50/50 dark:bg-gray-900/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-3 px-2 flex items-center gap-2">
                                    <span>{cat.icon}</span> {cat.title} Topics
                                </h4>
                                <div className="space-y-2">
                                    {topics.filter(t => t.categoryId === cat.id).length === 0 && <p className="text-xs italic text-gray-400 px-2 py-4">No topics found for this category.</p>}
                                    {topics.filter(t => t.categoryId === cat.id).map(topic => (
                                        <div key={topic.id} className="flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm group">
                                            <div className="flex-grow">
                                                <h5 className="font-bold dark:text-white text-sm">{topic.title}</h5>
                                                <p className="text-[10px] text-gray-400 truncate max-w-[300px] mt-1">{topic.content}</p>
                                            </div>
                                            <div className="flex gap-2 ml-4">
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
        </div>
    );
};

export default ManageHelpCenter;
