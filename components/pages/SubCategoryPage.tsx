
import React from 'react';
import { Category } from '../../types';

interface SubCategoryPageProps {
  category: Category;
  onNavigate: (view: 'home') => void;
  onListingNavigate: (view: 'listings', query: string) => void;
}

const SubCategoryPage: React.FC<SubCategoryPageProps> = ({ category, onNavigate, onListingNavigate }) => {
  return (
    <div className="animate-fade-in">
      <header className="flex items-center mb-6">
        <button
          onClick={() => onNavigate('home')}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Back to home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white ml-4">{category.name}</h1>
      </header>
      
      <div className="space-y-3">
        {category.subcategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onListingNavigate('listings', sub.name)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-dark-surface rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left"
          >
            <span className="font-medium text-gray-800 dark:text-gray-200">{sub.name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubCategoryPage;
