
import React, { useState, useEffect } from 'react';
import { HomeBanner, Listing } from '../../types';
import { db } from '../../firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { CLOUDINARY_URL, CLOUDINARY_UPLOAD_PRESET } from '../../constants';

interface ManageBannersProps {
    listings: Listing[];
}

const ManageBanners: React.FC<ManageBannersProps> = ({ listings }) => {
    const [banners, setBanners] = useState<HomeBanner[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Omit<HomeBanner, 'id'>>({
        title: '',
        subtitle: '',
        color: 'from-blue-600 to-blue-800',
        icon: '🔥',
        imageUrl: '',
        link: '',
        isActive: true,
        order: 0
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    const colorOptions = [
        { name: 'Teal/Green', class: 'from-teal-500 to-green-600' },
        { name: 'Blue/Deep', class: 'from-blue-600 to-blue-800' },
        { name: 'Orange/Red', class: 'from-orange-500 to-red-500' },
        { name: 'Pink/Rose', class: 'from-pink-500 to-rose-500' },
        { name: 'Gray/Dark', class: 'from-gray-700 to-gray-900' },
        { name: 'Purple/Indigo', class: 'from-purple-600 to-indigo-600' },
    ];

    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'banners'));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HomeBanner));
            data.sort((a, b) => (a.order || 0) - (b.order || 0));
            setBanners(data);
            setLoading(false);
        }, (err) => {
            console.error("Manage Banners listener error:", err.message);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Cloudinary upload failed');
        const data = await response.json();
        return data.secure_url;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;

        setIsSaving(true);
        try {
            let finalImageUrl = formData.imageUrl;
            if (imageFile) {
                finalImageUrl = await uploadToCloudinary(imageFile);
            }

            const payload = { ...formData, imageUrl: finalImageUrl };

            if (isEditing) {
                await updateDoc(doc(db, 'banners', isEditing), payload);
                setIsEditing(null);
            } else {
                await addDoc(collection(db, 'banners'), { ...payload, order: banners.length });
                setIsAdding(false);
            }
            resetForm();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({ title: '', subtitle: '', color: 'from-blue-600 to-blue-800', icon: '🔥', imageUrl: '', link: '', isActive: true, order: 0 });
        setImageFile(null);
        setImagePreview('');
        setIsEditing(null);
        setIsAdding(false);
    };

    const handleEdit = (banner: HomeBanner) => {
        setFormData({
            title: banner.title || '',
            subtitle: banner.subtitle || '',
            color: banner.color,
            icon: banner.icon,
            imageUrl: banner.imageUrl || '',
            link: banner.link || '',
            isActive: banner.isActive,
            order: banner.order
        });
        setImagePreview(banner.imageUrl || '');
        setIsEditing(banner.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("⚠️ Are you sure you want to delete this banner permanently?")) {
            if (!db) return;
            try {
                await deleteDoc(doc(db, 'banners', id));
                // Success is handled by the real-time listener updating 'banners' state
            } catch (err: any) {
                console.error("Delete banner failed:", err.message);
                alert("Failed to delete banner. Check console for details.");
            }
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Banner Management</h2>
                    <p className="text-gray-500">Control the slider on the Home Page.</p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow hover:bg-primary-dark transition-all"
                    >
                        + Add Banner
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
                    <h3 className="text-xl font-bold mb-6 dark:text-white">{isEditing ? 'Edit Banner' : 'Create New Banner'}</h3>
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Title - Optional</label>
                                <input 
                                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})} 
                                    placeholder="e.g. SUMMER SALE" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Subtitle - Optional</label>
                                <input 
                                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={formData.subtitle} 
                                    onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                                    placeholder="e.g. Up to 50% off" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1 dark:text-gray-300">Icon (Emoji)</label>
                                    <input 
                                        className="w-full p-3 border rounded-xl text-center text-2xl dark:bg-gray-700 dark:border-gray-600" 
                                        value={formData.icon} 
                                        onChange={e => setFormData({...formData, icon: e.target.value})} 
                                        maxLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 dark:text-gray-300">Display Order</label>
                                    <input 
                                        type="number"
                                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                        value={formData.order} 
                                        onChange={e => setFormData({...formData, order: Number(e.target.value)})} 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300">Banner Background</label>
                                <div className="space-y-3">
                                    <div className="flex gap-4 items-start">
                                        <div className="flex-1">
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {colorOptions.map(opt => (
                                                    <button
                                                        key={opt.class}
                                                        type="button"
                                                        onClick={() => setFormData({...formData, color: opt.class})}
                                                        className={`h-10 rounded-lg bg-gradient-to-r ${opt.class} border-2 transition-all ${formData.color === opt.class ? 'border-primary' : 'border-transparent'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-gray-500">Pick a gradient if not uploading image.</p>
                                        </div>
                                        <div className="flex-1">
                                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 overflow-hidden relative">
                                                {imagePreview ? (
                                                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <>
                                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        <span className="text-[10px] text-gray-500 mt-1 font-bold">Upload Image</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                            </label>
                                            <p className="text-[10px] text-gray-500 mt-1">Image overrides icon/gradient.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 dark:text-gray-300">Action Link (Listing ID or Search Term)</label>
                                <input 
                                    className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs" 
                                    value={formData.link} 
                                    onChange={e => setFormData({...formData, link: e.target.value})} 
                                    placeholder="Paste Listing ID or e.g. 'Shoes'" 
                                />
                            </div>
                            <div className="flex items-center gap-3 py-2">
                                <input 
                                    type="checkbox" 
                                    id="bannerActive" 
                                    checked={formData.isActive} 
                                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                    className="w-5 h-5 rounded"
                                />
                                <label htmlFor="bannerActive" className="text-sm font-bold dark:text-gray-300">Banner is Live</label>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button type="button" onClick={resetForm} className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium">Cancel</button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="px-10 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                            >
                                {isSaving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                                {isEditing ? 'Update Banner' : 'Create Banner'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {banners.map(banner => (
                    <div key={banner.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col group">
                        {/* Preview */}
                        <div className={`h-36 bg-gray-200 dark:bg-gray-900 relative flex items-center justify-between text-white overflow-hidden`}>
                            {banner.imageUrl ? (
                                <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />
                            ) : (
                                <div className={`absolute inset-0 bg-gradient-to-r ${banner.color}`}></div>
                            )}
                            
                            <div className="z-10 px-6">
                                <h4 className="font-extrabold text-xl drop-shadow-md">{banner.title || 'No Title'}</h4>
                                <p className="text-xs opacity-90 drop-shadow-sm">{banner.subtitle || ''}</p>
                            </div>
                            {!banner.imageUrl && <div className="z-10 text-6xl opacity-30 rotate-12 mr-6">{banner.icon}</div>}
                            
                            <div className="absolute top-2 right-2 z-20">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${banner.isActive ? 'bg-green-500' : 'bg-red-500'} text-white shadow-sm`}>
                                    {banner.isActive ? 'Live' : 'Hidden'}
                                </span>
                            </div>
                        </div>
                        {/* Info & Actions */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                                <p><span className="font-bold">Link:</span> {banner.link || 'None'}</p>
                                <p><span className="font-bold">Order:</span> {banner.order}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(banner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Banner">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(banner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Banner">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ManageBanners;
