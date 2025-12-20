
import React from 'react';
import { Listing, Category, ListingType, Vendor } from './types';

// ==========================================
// ☁️ CLOUDINARY CONFIGURATION
// REPLACE THESE 2 VALUES WITH YOUR OWN FROM CLOUDINARY DASHBOARD
// ==========================================
export const CLOUDINARY_CLOUD_NAME = "dpzcjr1cx"; 
export const CLOUDINARY_UPLOAD_PRESET = "Rizqdaan"; 
export const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ==========================================
// 📍 LOCATION DATA
// ==========================================
export const PAKISTAN_LOCATIONS: Record<string, string[]> = {
    "Khyber Pakhtunkhwa": [
        "Abbottabad", "Mansehra", "Peshawar", "Swat", "Mardan", "Swabi", "Nowshera", "Kohat", "Haripur", "Bannu", "D.I. Khan", "Chitral"
    ],
    "Punjab": [
        "Lahore", "Faisalabad", "Rawalpindi", "Multan", "Gujranwala", "Sialkot", "Sargodha", "Bahawalpur", "Jhelum", "Sheikhupura", "Gujrat"
    ],
    "Sindh": [
        "Karachi", "Hyderabad", "Sukkur", "Larkana", "Nawabshah", "Mirpur Khas"
    ],
    "Balochistan": [
        "Quetta", "Gwadar", "Turbat", "Khuzdar", "Sibi"
    ],
    "Islamabad Capital Territory": [
        "Islamabad"
    ],
    "Azad Kashmir": [
        "Muzaffarabad", "Mirpur", "Rawalakot", "Kotli"
    ],
    "Gilgit-Baltistan": [
        "Gilgit", "Skardu", "Hunza"
    ]
};


export const Logo = () => (
    <div className="bg-primary text-white flex items-center justify-center rounded-xl h-full w-full p-2 shadow-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
    </div>
);


export const ICONS: Record<string, React.ReactElement> = {
    food: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-5.45-6.942h10.9M5.45 6.253L3 20h18l-2.45-13.747A5 5 0 0013.5 2h-3a5 5 0 00-4.95 4.253z" /></svg>,
    shopping: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    services: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    home: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    electronics: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    vehicle: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16.5V14a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2.5"></path><path d="M2 14H1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1"></path><path d="M23 14h-1a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1"></path><path d="M5 18H3.5a1.5 1.5 0 0 1 0-3H5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9"></path><circle cx="6.5" cy="18.5" r="2.5"></circle><circle cx="17.5" cy="18.5" r="2.5"></circle></svg>,
    health: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>,
    education: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0122 12.5V19l-10 5L2 19v-6.5c0-1.18.31-2.298.84-3.278L12 14z" /></svg>,
    construction: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 12l-9 9" /></svg>,
    agriculture: <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 22c2-2 4-2 6-2s4 0 6 2s4-2 6-2"></path><path d="M12 14v8"></path><path d="M10 14h4"></path><path d="M12 2a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0V4a2 2 0 0 0-2-2z"></path><path d="M12 6c-2.2 0-4 1.8-4 4v2c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-2c0-2.2-1.8-4-4-4z"></path></svg>,
};


export const CATEGORIES: Category[] = [
  {
    id: 'c1', name: 'Shops & Retail', icon: 'shopping', subcategories: [
      { id: 'c1-s1', name: 'Grocery Stores' },
      { id: 'c1-s2', name: 'Super Markets' },
      { id: 'c1-s3', name: 'Mobile Shops' },
      { id: 'c1-s4', name: 'Electronics & Appliances' },
      { id: 'c1-s5', name: 'Clothing & Fashion' },
      { id: 'c1-s6', name: 'Shoes & Bags' },
      { id: 'c1-s7', name: 'Cosmetics & Beauty' },
      { id: 'c1-s8', name: 'Jewelry & Accessories' },
      { id: 'c1-s9', name: 'Toys & Baby Store' },
      { id: 'c1-s10', name: 'Stationery & Bookshops' },
      { id: 'c1-s11', name: 'Hardware Store' },
      { id: 'c1-s12', name: 'Furniture & Woodwork' },
      { id: 'c1-s13', name: 'Home Decor Shop' },
      { id: 'c1-s14', name: 'Sports & Fitness' },
      { id: 'c1-s15', name: 'Pet Shop' },
    ]
  },
  {
    id: 'c2', name: 'Services', icon: 'services', subcategories: [
      { id: 'c2-s1', name: 'Electrician' },
      { id: 'c2-s2', name: 'Plumber' },
      { id: 'c2-s3', name: 'Carpenter' },
      { id: 'c2-s4', name: 'Painter' },
      { id: 'c2-s5', name: 'AC / Fridge Technician' },
      { id: 'c2-s6', name: 'Car Mechanic' },
      { id: 'c2-s7', name: 'Bike Mechanic' },
      { id: 'c2-s8', name: 'Home Tutor' },
      { id: 'c2-s9', name: 'Driving Instructor' },
      { id: 'c2-s10', name: 'Photographer' },
      { id: 'c2-s11', name: 'Tailor (Gents/Ladies)' },
      { id: 'c2-s12', name: 'Beautician / Makeup' },
      { id: 'c2-s13', name: 'Barber / Hair Salon' },
      { id: 'c2-s14', name: 'Laundry & Dry Cleaning' },
      { id: 'c2-s15', name: 'Event Planner' },
      { id: 'c2-s16', name: 'Catering Service' },
      { id: 'c2-s17', name: 'Printing & Graphics' },
      { id: 'c2-s18', name: 'Web/Digital Marketing' },
    ]
  },
  {
    id: 'c3', name: 'Food', icon: 'food', subcategories: [
      { id: 'c3-s1', name: 'Restaurants' },
      { id: 'c3-s2', name: 'Fast Food' },
      { id: 'c3-s3', name: 'Cafes' },
      { id: 'c3-s4', name: 'Bakers & Sweets' },
      { id: 'c3-s5', name: 'Dairy Shops' },
      { id: 'c3-s6', name: 'Fruit / Vegetable Shops' },
      { id: 'c3-s7', name: 'Meat & Chicken Shops' },
      { id: 'c3-s8', name: 'BBQ Points' },
      { id: 'c3-s9', name: 'Home Chefs' },
    ]
  },
  {
    id: 'c4', name: 'Real Estate', icon: 'home', subcategories: [
      { id: 'c4-s1', name: 'Property Dealers' },
      { id: 'c4-s2', name: 'Rent Houses' },
      { id: 'c4-s3', name: 'Rooms for Rent' },
      { id: 'c4-s4', name: 'Shops for Rent' },
      { id: 'c4-s5', name: 'Land / Plot Listings' },
      { id: 'c4-s6', name: 'Construction Services' },
      { id: 'c4-s7', name: 'Builders & Developers' },
    ]
  },
  {
    id: 'c5', name: 'Automotive', icon: 'vehicle', subcategories: [
      { id: 'c5-s1', name: 'Car Dealers' },
      { id: 'c5-s2', name: 'Bike Dealers' },
      { id: 'c5-s3', name: 'Auto Parts Shops' },
      { id: 'c5-s4', name: 'Tyre Shops' },
      { id: 'c5-s5', name: 'Car Wash' },
      { id: 'c5-s6', name: 'Oil Change Services' },
      { id: 'c5-s7', name: 'Rent a Car' },
    ]
  },
  {
    id: 'c6', name: 'Health & Medical', icon: 'health', subcategories: [
      { id: 'c6-s1', name: 'Clinics' },
      { id: 'c6-s2', name: 'Doctors' },
      { id: 'c6-s3', name: 'Medical Stores' },
      { id: 'c6-s4', name: 'Labs' },
      { id: 'c6-s5', name: 'Physiotherapists' },
      { id: 'c6-s6', name: 'Home Nurse Service' },
    ]
  },
  {
    id: 'c7', name: 'Education', icon: 'education', subcategories: [
      { id: 'c7-s1', name: 'Schools' },
      { id: 'c7-s2', name: 'Colleges' },
      { id: 'c7-s3', name: 'Academies' },
      { id: 'c7-s4', name: 'Tuition Centers' },
      { id: 'c7-s5', name: 'Madaris' },
      { id: 'c7-s6', name: 'Skill Training' },
      { id: 'c7-s7', name: 'Computer Courses' },
      { id: 'c7-s8', name: 'English Language' },
    ]
  },
  {
    id: 'c8', name: 'Construction', icon: 'construction', subcategories: [
      { id: 'c8-s1', name: 'Cement / Bricks / Sand' },
      { id: 'c8-s2', name: 'Marble & Tiles' },
      { id: 'c8-s3', name: 'Glass Shops' },
      { id: 'c8-s4', name: 'Paint Shops' },
      { id: 'c8-s5', name: 'Sanitary Shops' },
      { id: 'c8-s6', name: 'Lighting & Electrical' },
      { id: 'c8-s7', name: 'Solar System Providers' },
      { id: 'c8-s8', name: 'Water Tankers' },
      { id: 'c8-s9', name: 'Construction Labour' },
    ]
  },
  {
    id: 'c9', name: 'Agriculture', icon: 'agriculture', subcategories: [
      { id: 'c9-s1', name: 'Seeds & Fertilizer' },
      { id: 'c9-s2', name: 'Tractor Mechanics' },
      { id: 'c9-s3', name: 'Agriculture Tools' },
      { id: 'c9-s4', name: 'Feed Shops' },
      { id: 'c9-s5', name: 'Dairy Farm Accessories' },
    ]
  },
  {
    id: 'c10', name: 'Freelancers', icon: 'electronics', subcategories: [
      { id: 'c10-s1', name: 'Graphic Designer' },
      { id: 'c10-s2', name: 'Video Editor' },
      { id: 'c10-s3', name: 'Content Writer' },
      { id: 'c10-s4', name: 'Social Media Manager' },
      { id: 'c10-s5', name: 'Online Store Owners' },
      { id: 'c10-s6', name: 'Local Delivery' },
    ]
  },
];
