import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { CATEGORIES, CLOUDINARY_URL, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_CLOUD_NAME, PAKISTAN_LOCATIONS } from '../../constants';
import { ListingType, Listing } from '../../types';
import { generateDescription } from '../../services/geminiService';

// --- ROBUST COMPRESSION UTILITY ---
const compressImage = async (file: File): Promise<File> => {
    const compressionPromise = new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; 
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
                        const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    }, 'image/jpeg', 0.6); 
                } catch (e) {
                    resolve(file); 
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });

    const timeoutPromise = new Promise<File>((resolve) => {
        setTimeout(() => resolve(file), 3000);
    });

    return Promise.race([compressionPromise, timeoutPromise]);
};

interface AddListingFormProps {
    onSuccess?: () => void;
    initialData?: Listing | null; // Added for Edit Mode
}

const AddListingForm: React.FC<AddListingFormProps> = ({ onSuccess, initialData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // New Price States
  const [price, setPrice] = useState(''); // This will be the FINAL/DISCOUNTED price
  const [originalPrice, setOriginalPrice] = useState(''); // This is the optional higher price
  
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [type, setType] = useState<ListingType>(ListingType.Product);
  const [keywords, setKeywords] = useState('');
  
  // Structured Location State
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  
  const [gpsCoords, setGpsCoords] = useState<{lat: number, lng: number} | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Existing images (URLs) from the database
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // New files selected by user
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Previews for new files
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const isEditMode = !!initialData;

  // Calculate discount percentage for display
  const discountPercent = useMemo(() => {
    const orig = parseFloat(originalPrice);
    const disc = parseFloat(price);
    if (orig > 0 && disc > 0 && orig > disc) {
      return Math.round(((orig - disc) / orig) * 100);
    }
    return 0;
  }, [originalPrice, price]);

  // Pre-fill form if editing
  useEffect(() => {
      if (initialData) {
          setTitle(initialData.title);
          setDescription(initialData.description);
          setPrice(initialData.price.toString());
          setOriginalPrice(initialData.originalPrice?.toString() || '');
          setCategory(initialData.category);
          setType(initialData.type);
          
          const locParts = initialData.location ? initialData.location.split(',').map(s => s.trim()) : [];
          if (locParts.length >= 3) {
              const prov = locParts.pop() || '';
              const cty = locParts.pop() || '';
              const addr = locParts.join(', ');
              
              if (Object.keys(PAKISTAN_LOCATIONS).includes(prov)) {
                  setSelectedProvince(prov);
                  setSelectedCity(cty);
                  setManualAddress(addr);
              } else {
                  setManualAddress(initialData.location);
              }
          } else {
              setManualAddress(initialData.location || '');
          }

          if (initialData.latitude && initialData.longitude) {
              setGpsCoords({ lat: initialData.latitude, lng: initialData.longitude });
          }
          
          const imgs = initialData.images && initialData.images.length > 0 
              ? initialData.images 
              : [initialData.imageUrl];
          setExistingImages(imgs);
      }
  }, [initialData]);

  // --- HANDLERS ---

  const handleGetLocation = () => {
      if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser.");
          return;
      }
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setGpsCoords({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
              });
              setGettingLocation(false);
              alert("✅ Location pinned successfully!");
          },
          (error) => {
              setGettingLocation(false);
              console.error("Error getting location:", error.message);
              alert("Unable to retrieve your location. Please ensure GPS is enabled.");
          }
      );
  };

  const handleGenerateDescription = async () => {
    if (!keywords.trim()) {
        alert("Please enter keywords first.");
        return;
    }
    setIsGenerating(true);
    try {
      const generatedDesc = await generateDescription(keywords);
      setDescription(generatedDesc);
    } catch (error) {
      alert('AI generation failed. Please write manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const files = Array.from(e.target.files) as File[];
          const totalImages = existingImages.length + selectedFiles.length + files.length;
          
          if (totalImages > 8) {
              alert("Maximum 8 images allowed.");
              return;
          }
          const newPreviews = files.map(file => URL.createObjectURL(file));
          setNewFilePreviews(prev => [...prev, ...newPreviews]);
          setSelectedFiles(prev => [...prev, ...files]);
      }
  };

  const removeNewImage = (index: number) => {
      URL.revokeObjectURL(newFilePreviews[index]);
      setNewFilePreviews(prev => prev.filter((_, i) => i !== index));
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 
      
      const response = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
           const errorData = await response.json();
           if (errorData.error?.message?.includes("Upload preset must be specified")) {
               throw new Error("Upload Preset Missing. Please save 'RizqDaan' preset in Cloudinary Settings.");
           } else if (errorData.error?.message?.includes("Upload preset not found")) {
                throw new Error("Invalid Preset Name. Check spelling in constants.tsx");
           }
           throw new Error(errorData.error?.message || 'Cloudinary upload failed');
      }
      const data = await response.json();
      return data.secure_url;
  };

  const handleFormSubmit = async (e: React.FormEvent, status: 'active' | 'draft' = 'active') => {
      e.preventDefault();
      
      if (!auth.currentUser || !db) {
          alert("You must be logged in.");
          return;
      }
      if (!title || !price) {
          alert("Please fill in Title and the main (final) Price.");
          return;
      }
      
      if (!manualAddress || !selectedCity || !selectedProvince) {
          alert("Please complete the full address (Province, City and Street/Shop).");
          return;
      }

      const fullLocationString = `${manualAddress}, ${selectedCity}, ${selectedProvince}`;

      if (existingImages.length === 0 && selectedFiles.length === 0) {
          alert("Please add at least 1 photo.");
          return;
      }

      setIsLoading(true);
      const finalImageUrls: string[] = [...existingImages];

      try {
          for (let i = 0; i < selectedFiles.length; i++) {
              setLoadingText(`Uploading Image ${i + 1}/${selectedFiles.length}...`);
              
              try {
                  const fileToUpload = await compressImage(selectedFiles[i]);
                  const url = await uploadToCloudinary(fileToUpload);
                  finalImageUrls.push(url);
              } catch (uploadError: any) {
                  console.error("Upload failed:", uploadError?.message || "Unknown error");
                  if (uploadError.message.includes("Preset")) {
                      alert(`Cloudinary Configuration Error: ${uploadError.message}`);
                      setIsLoading(false);
                      return;
                  }
                  finalImageUrls.push('https://placehold.co/600x400?text=Upload+Error');
              }
          }

          setLoadingText(isEditMode ? 'Updating Listing...' : (status === 'draft' ? 'Saving Draft...' : 'Saving Listing...'));
          
          const finalPrice = parseFloat(price);
          const finalOriginalPrice = parseFloat(originalPrice);
          
          const listingData = {
              title,
              description,
              price: finalPrice, // Final/Discounted Price
              originalPrice: (finalOriginalPrice > finalPrice) ? finalOriginalPrice : null,
              category,
              type,
              imageUrl: finalImageUrls[0] || 'https://placehold.co/600x400',
              images: finalImageUrls,
              status,
              location: fullLocationString,
              latitude: gpsCoords?.lat || null,
              longitude: gpsCoords?.lng || null,
              updatedAt: new Date().toISOString(),
              ...(isEditMode ? {} : {
                  vendorId: auth.currentUser.uid,
                  vendorName: auth.currentUser.displayName || 'Vendor',
                  rating: 0,
                  reviews: [],
                  contact: { phone: '', whatsapp: '' },
                  itemsSold: 0,
                  hasFreeDelivery: false,
                  views: 0,
                  likes: 0,
                  isPromoted: false,
                  createdAt: new Date().toISOString()
              })
          };

          if (isEditMode && initialData) {
              const docRef = doc(db, "listings", initialData.id);
              await updateDoc(docRef, listingData);
          } else {
              await addDoc(collection(db, "listings"), listingData);
          }

          setLoadingText('Success!');
          setTimeout(() => {
              if (onSuccess) onSuccess();
          }, 1000);

      } catch (error: any) {
          console.error("General Error:", error?.message || "Unknown error");
          alert(`Error saving listing: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="pb-10 animate-fade-in">
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          {isEditMode ? 'Edit Listing' : 'Create New Ad'}
      </h3>
      
      {(CLOUDINARY_CLOUD_NAME as string) === 'demo' && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
              <p className="font-bold">Setup Required</p>
              <p className="text-sm">Please update Cloudinary keys in <code>constants.tsx</code>.</p>
          </div>
      )}

      <form className="space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none"
            placeholder="e.g. Handmade Leather Wallet"
            disabled={isLoading}
          />
        </div>

        {/* --- NEW PRICE SECTION --- */}
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                 <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                 Pricing
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Original Price (Rs)</label>
                    <input
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl outline-none"
                        placeholder="e.g. 1500 (Optional)"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Discounted Price (Rs)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-primary rounded-xl outline-none"
                        placeholder="e.g. 1200 (Required)"
                        required
                        disabled={isLoading}
                    />
                </div>
            </div>
            {discountPercent > 0 && (
                <div className="text-center p-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold border border-green-200">
                    You're offering a {discountPercent}% discount!
                </div>
            )}
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                disabled={isLoading}
            >
                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
        </div>
        
        <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                 <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                 Location Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
                <div>
                     <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
                     <input type="text" value="Pakistan" disabled className="w-full px-3 py-2 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-500 dark:text-gray-300" />
                </div>
                <div>
                     <label className="block text-xs font-medium text-gray-500 mb-1">Province</label>
                     <select 
                        value={selectedProvince}
                        onChange={(e) => {
                            setSelectedProvince(e.target.value);
                            setSelectedCity('');
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                     >
                         <option value="">Select Province</option>
                         {Object.keys(PAKISTAN_LOCATIONS).map(prov => (
                             <option key={prov} value={prov}>{prov}</option>
                         ))}
                     </select>
                </div>
            </div>
            <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">City / Town</label>
                 <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={!selectedProvince}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                 >
                     <option value="">{selectedProvince ? "Select City" : "Select Province First"}</option>
                     {selectedProvince && PAKISTAN_LOCATIONS[selectedProvince]?.map(city => (
                         <option key={city} value={city}>{city}</option>
                     ))}
                 </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Shop Address / Street / Area</label>
                <input
                    type="text"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    placeholder="e.g. Shop #5, Main Bazaar, Near Masjid"
                />
            </div>
            <div className="pt-2">
                <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={gettingLocation || isLoading}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                    {gettingLocation ? (
                        <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                    {gpsCoords ? 'GPS Location Saved ✅' : 'Pin Exact Location with GPS'}
                </button>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos (Max 8)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {existingImages.map((src, idx) => (
                    <div key={`existing-${idx}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-green-500">
                        <img src={src} alt="Existing" className="w-full h-full object-cover" />
                        {!isLoading && (
                            <button
                                type="button"
                                onClick={() => removeExistingImage(idx)}
                                className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl-lg shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                        <span className="absolute bottom-0 left-0 bg-green-500 text-white text-[10px] px-1">Saved</span>
                    </div>
                ))}

                {newFilePreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-blue-500">
                        <img src={src} alt="New Preview" className="w-full h-full object-cover" />
                        {!isLoading && (
                            <button
                                type="button"
                                onClick={() => removeNewImage(idx)}
                                className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl-lg shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                         <span className="absolute bottom-0 left-0 bg-blue-500 text-white text-[10px] px-1">New</span>
                    </div>
                ))}
                
                {(existingImages.length + selectedFiles.length) < 8 && !isLoading && (
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-primary/50 rounded-xl bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs text-primary font-medium mt-1">Add Photo</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                    </label>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <div className="text-xs text-primary cursor-pointer hover:underline" onClick={() => !isGenerating && document.getElementById('ai-keywords')?.focus()}>
                   ✨ Use AI Writer
                </div>
            </div>
            
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                placeholder="Describe your item details..."
                disabled={isLoading}
            ></textarea>

            <div className="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <input
                    id="ai-keywords"
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Keywords (e.g. Leather wallet)"
                    className="flex-grow bg-transparent px-2 py-1 text-sm outline-none dark:text-white"
                />
                <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGenerating || isLoading}
                    className="bg-primary text-white text-xs px-3 py-2 rounded-md font-medium"
                >
                    {isGenerating ? '...' : 'Generate'}
                </button>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
             <button
                type="button"
                onClick={(e) => handleFormSubmit(e, 'draft')}
                disabled={isLoading}
                className="flex-1 py-4 text-gray-700 font-semibold text-lg rounded-xl border border-gray-300 hover:bg-gray-50 transition-all dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
                Save as Draft
            </button>
            <button
                type="button"
                onClick={(e) => handleFormSubmit(e, 'active')}
                disabled={isLoading}
                className={`flex-[2] py-4 text-white font-bold text-lg rounded-xl shadow-lg transition-all transform active:scale-95 ${
                    isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'
                }`}
            >
                {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        {loadingText}
                    </span>
                ) : (isEditMode ? 'Update Listing' : 'Post Listing Now')}
            </button>
        </div>

      </form>
    </div>
  );
};

export default AddListingForm;
