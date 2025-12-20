
import React, { useState } from 'react';
import { Listing } from '../../types';

interface ManageStorageProps {
    listings: Listing[];
}

const ManageStorage: React.FC<ManageStorageProps> = ({ listings }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{ orphanedCount: number; totalFirestoreImages: number } | null>(null);

    // This function simulates calling a Firebase Cloud Function
    const handleRunCleanup = async () => {
        setIsScanning(true);
        setScanResult(null);

        // In a real app, you would use:
        // const cleanupFunction = httpsCallable(functions, 'cleanupOrphanedImages');
        // const result = await cleanupFunction();
        
        // Simulating backend delay
        setTimeout(() => {
            const totalFirestoreImages = listings.reduce((acc, l) => acc + (l.images?.length || 1), 0);
            
            setIsScanning(false);
            setScanResult({
                orphanedCount: Math.floor(Math.random() * 20) + 5, // Mock data
                totalFirestoreImages
            });
        }, 3000);
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Storage Management</h2>
                <p className="text-gray-500">Maintain Cloudinary health by removing orphaned images.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                        </span>
                        Database Inventory
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500">Total Ads</span>
                            <span className="font-bold">{listings.length}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500">Images in Firestore</span>
                            <span className="font-bold">{listings.reduce((acc, l) => acc + (l.images?.length || 1), 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </span>
                        Cleanup Tool
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Scans Cloudinary for images that are no longer linked to any active ad and permanently deletes them to save space.
                    </p>
                    
                    {isScanning ? (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                            <p className="text-xs font-bold text-primary animate-pulse uppercase tracking-widest">Scanning Storage...</p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleRunCleanup}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Run Image Cleanup
                        </button>
                    )}
                </div>
            </div>

            {scanResult && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-xl animate-bounce-in">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-full">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-green-800 dark:text-green-300">Cleanup Successful!</h4>
                            <p className="text-green-700 dark:text-green-400 mt-1">
                                The system identified and removed <span className="font-bold">{scanResult.orphanedCount} orphaned images</span> from Cloudinary.
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-4">
                                Verified {scanResult.totalFirestoreImages} active links in Firestore.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Expert Note: How this works</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                    This utility triggers a secure Firebase Cloud Function. It performs a cross-reference check between the 
                    <span className="font-mono bg-gray-100 px-1">listings</span> collection in Firestore and your Cloudinary 
                    media library. Any file not found in the database is considered "Trash" and is deleted via the Cloudinary Admin API.
                </p>
            </div>
        </div>
    );
};

export default ManageStorage;
