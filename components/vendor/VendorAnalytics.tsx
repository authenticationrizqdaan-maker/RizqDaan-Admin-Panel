import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Listing, User } from '../../types';

interface VendorAnalyticsProps {
    listings?: Listing[];
    user?: User | null;
}

const VendorAnalytics: React.FC<VendorAnalyticsProps> = ({ listings = [], user }) => {
  
  // Filter for current user's listings
  const myListings = user ? listings.filter(l => l.vendorId === user.id) : [];

  // Calculate Totals
  const totalViews = myListings.reduce((sum, item) => sum + (item.views || 0), 0);
  const totalLikes = myListings.reduce((sum, item) => sum + (item.likes || 0), 0);
  const totalReviews = myListings.reduce((sum, item) => sum + (item.reviews?.length || 0), 0);
  const totalCalls = myListings.reduce((sum, item) => sum + (item.calls || 0), 0);

  const chartData = [
    { name: 'Views', value: totalViews },
    { name: 'Likes', value: totalLikes },
    { name: 'Calls', value: totalCalls },
    { name: 'Reviews', value: totalReviews },
  ];

  return (
    <div>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Listing Analytics</h3>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg shadow">
          <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase">Total Views</h4>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalViews}</p>
        </div>
        <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg shadow">
          <h4 className="text-xs font-semibold text-green-800 dark:text-green-200 uppercase">Total Calls</h4>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalCalls}</p>
        </div>
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg shadow">
          <h4 className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 uppercase">Reviews</h4>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{totalReviews}</p>
        </div>
        <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg shadow">
          <h4 className="text-xs font-semibold text-red-800 dark:text-red-200 uppercase">Likes</h4>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">{totalLikes}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-10 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
        <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4">Performance Overview</h4>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
            <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#888888" />
                <YAxis stroke="#888888" />
                <Tooltip
                    contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                        borderColor: '#e5e7eb',
                        color: '#1f2937',
                        borderRadius: '0.5rem'
                    }}
                />
                <Bar dataKey="value" fill="#002f34" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-hidden bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-bold text-gray-800 dark:text-white">Top Performing Listings</h4>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                  <thead className="uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <tr>
                          <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Listing Name</th>
                          <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Views</th>
                          <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Calls</th>
                          <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Likes</th>
                          <th scope="col" className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Rating</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {myListings.length > 0 ? myListings.map((listing) => (
                          <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-gray-800 dark:text-white flex items-center gap-3">
                                  <img src={listing.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                                  <span className="truncate max-w-[150px]">{listing.title}</span>
                              </td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{listing.views || 0}</td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{listing.calls || 0}</td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{listing.likes || 0}</td>
                              <td className="px-6 py-4 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                  <span className="text-yellow-500">★</span> {listing.rating.toFixed(1)}
                              </td>
                          </tr>
                      )) : (
                          <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No active listings data available.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};

export default VendorAnalytics;