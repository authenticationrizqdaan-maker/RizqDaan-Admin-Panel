
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { db, auth } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
// FIX: Using modular named import for Firebase Auth to fix updateProfile property access error
import { updateProfile } from 'firebase/auth';
import { CLOUDINARY_URL, CLOUDINARY_UPLOAD_PRESET } from '../../constants';

// --- COMPRESSION UTILITY ---
const compressImage = async (file: File): Promise<File> => {
    return new Promise<File>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000; // Slightly higher for cover photos
                    const scaleSize = MAX_WIDTH / img.width;
                    const width = scaleSize < 1 ? MAX_WIDTH : img.width;
                    const height = scaleSize < 1 ? img.height * scaleSize : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { resolve(file); return; } 
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) { resolve(file); return; } 
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    }, 'image/jpeg', 0.7); // 70% quality
                } catch (e) {
                    resolve(file); 
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

interface EditProfilePageProps {
  user: User;
  // Use more generic type to match App.tsx callback signature
  onNavigate: (view: string, payload?: any) => void;
}

const EditProfilePage: React.FC<EditProfilePageProps> = ({ user, onNavigate }) => {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [shopName, setShopName] = useState(user.shopName || '');
  const [shopAddress, setShopAddress] = useState(user.shopAddress || '');
  const [bio, setBio] = useState(user.bio || '');
  
  // Image State - Profile
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(user.profilePictureUrl || '');

  // Image State - Cover
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>(user.coverPictureUrl || '');

  const [isUploading, setIsUploading] = useState(false);
  const [loadingText, setLoadingText] = useState('Saving Changes...');

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== user.profilePictureUrl) URL.revokeObjectURL(previewUrl);
      if (coverPreviewUrl && coverPreviewUrl !== user.coverPictureUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [previewUrl, user.profilePictureUrl, coverPreviewUrl, user.coverPictureUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      
      if (type === 'profile') {
          setImageFile(file);
          setPreviewUrl(url);
      } else {
          setCoverFile(file);
          setCoverPreviewUrl(url);
      }
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
      if (!navigator.onLine) {
          throw new Error("No internet connection");
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 

      const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || 'Cloudinary upload failed');
      }

      const data = await response.json();
      return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setLoadingText('Processing Images...');

    try {
      let profileUrl: string | null = user.profilePictureUrl || null;
      let coverUrl: string | null = user.coverPictureUrl || null;

      // 1. Compress & Upload Profile Image
      if (imageFile) {
        setLoadingText('Uploading Profile Pic...');
        const compressedProfile = await compressImage(imageFile);
        profileUrl = await uploadToCloudinary(compressedProfile);
      }

      // 2. Compress & Upload Cover Image
      if (coverFile) {
        setLoadingText('Uploading Cover Photo...');
        const compressedCover = await compressImage(coverFile);
        coverUrl = await uploadToCloudinary(compressedCover);
      }

      setLoadingText('Updating Profile...');

      // 3. Update Firestore User Document
      if (db) {
        const userRef = doc(db, "users", user.id);
        await updateDoc(userRef, {
            name,
            phone,
            shopName,
            shopAddress,
            bio,
            profilePictureUrl: profileUrl,
            coverPictureUrl: coverUrl
        });
      }

      // 4. Update Firebase Auth Profile (DisplayName & PhotoURL)
      if (auth.currentUser) {
          await updateProfile(auth.currentUser, {
              displayName: name,
              photoURL: profileUrl || "" 
          });
      }

      alert("✅ Profile Updated Successfully!");
      onNavigate('account');

    } catch (error: any) {
      console.error("Error updating profile:", error?.message || "Unknown error");
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <header className="flex items-center mb-6">
        <button
          onClick={() => onNavigate('account')}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Back to account"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">Edit Profile</h1>
      </header>

      <div className="max-w-3xl mx-auto bg-white dark:bg-dark-surface rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSubmit}>
          
          {/* Professional Cover Photo Area */}
          <div className="relative h-52 bg-gray-200 dark:bg-gray-800 group cursor-pointer overflow-hidden">
              {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                  <div className="w-full h-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                       <div className="text-center">
                            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="font-medium">Add Cover Photo</span>
                       </div>
                  </div>
              )}
              
              {/* Hover Overlay for Cover */}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/40 rounded-full text-white font-medium flex items-center gap-2 shadow-lg">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     Change Cover
                  </div>
              </div>
              <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'cover')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          </div>

          <div className="px-6 md:px-10 pb-10 relative">
             
             {/* Profile Picture Area (Overlapping) */}
             <div className="relative -mt-16 mb-8 flex justify-center md:justify-start">
                <div className="relative group cursor-pointer">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-dark-surface shadow-xl bg-white">
                        {previewUrl ? (
                            <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 text-4xl font-bold">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    
                    {/* Hover Overlay for Profile */}
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-4 border-transparent">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                        </svg>
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'profile')} className="absolute inset-0 opacity-0 cursor-pointer rounded-full z-20" />
                    
                    {/* Camera Icon Badge */}
                    <div className="absolute bottom-1 right-1 bg-primary text-white p-1.5 rounded-full shadow-md border-2 border-white dark:border-dark-surface pointer-events-none">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                <div>
                    <label htmlFor="shopName" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Shop / Business Name</label>
                    <input
                        id="shopName"
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Your Full Name</label>
                        <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        required
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Phone Number</label>
                        <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="shopAddress" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Complete Address</label>
                    <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-400">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </span>
                        <input
                        id="shopAddress"
                        type="text"
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                        required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="bio" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Bio / About Shop</label>
                    <textarea
                        id="bio"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell customers about your business, specialties, and history..."
                        className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                    />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Email Address</label>
                    <input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="block w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email address cannot be changed.</p>
                </div>

                <div className="pt-6">
                    <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
                    >
                    {isUploading ? (
                        <span className="flex items-center justify-center gap-3">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            {loadingText}
                        </span>
                    ) : "Save Profile Changes"}
                    </button>
                </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
