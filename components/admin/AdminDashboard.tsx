
import React from 'react';
import { User, Listing } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
  users: User[];
  listings: Listing[];
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement; color: string; }> = ({ title, value, icon, color }) => (
  <div className={`p-6 rounded-xl shadow-lg flex items-center space-x-4 ${color}`}>
    <div className="text-white p-3 rounded-full bg-black bg-opacity-20">
      {React.cloneElement(icon as React.ReactElement<any>, { className: "h-8 w-8"})}
    </div>
    <div>
      <p className="text-white text-lg font-semibold">{title}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  </div>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, listings }) => {
  const vendors = users.filter(u => !u.isAdmin);
  const pendingVerifications = vendors.filter(v => !v.isVerified).length;

  // FIX: Use type assertion on initial value instead of generic type argument on reduce
  // to avoid "Untyped function calls" error and ensure correct typing for accumulator.
  const listingsByCategory = listings.reduce((acc, listing) => {
    acc[listing.category] = (acc[listing.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(listingsByCategory)
    .map(([name, count]) => ({ name, count: Number(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard 
          title="Total Vendors" 
          value={vendors.length} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.284-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.284.24-1.857m10 0A5 5 0 0013 11V7a4 4 0 00-8 0v4a5 5 0 00-4.24 5.143" /></svg>}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard 
          title="Total Listings" 
          value={listings.length} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatCard 
          title="Pending Verifications" 
          value={pendingVerifications} 
          icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
        />
      </div>

      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Top 5 Categories by Listings</h3>
      <div className="h-80 w-full bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 50, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(30, 30, 30, 0.8)', 
                    borderColor: '#555',
                    color: '#fff',
                    borderRadius: '0.5rem'
                }}
            />
            <Legend />
            <Bar dataKey="count" name="Listings" fill="#002f34" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminDashboard;
    