"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Activity, ShieldCheck, DollarSign, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/utils/supabase';

export default function Dashboard() {
  const { role } = useAuth();
  
  const [stats, setStats] = useState({
    totalMedicines: 0,
    lowStockItems: 0,
    expiringSoon: 0,
    salesThisMonth: '0.00',
    totalRevenue: '0.00',
    totalItemsSold: 0
  });
  
  const [recentSales, setRecentSales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadDashboardData = async () => {
      // Fetch Medicines
      const { data: meds } = await supabase.from('medicine').select('*');
      
      // Fetch Sales and related Customer names & Include Quantities
      // We will do simple separate queries for simplicity if joins are tricky, but Supabase supports them.
      const { data: salesInfo } = await supabase.from('sales').select(`
         sale_id, sale_date, total_amount,
         customer ( name )
      `).order('sale_date', { ascending: false });

      const { data: includes } = await supabase.from('includes').select('quantity');

      const safeMeds = meds || [];
      const safeSales = salesInfo || [];
      const safeIncludes = includes || [];

      // Calculate Medicine Stats
      const totalMedicines = safeMeds.length;
      // Assuming minimum stock threshold as 50 globally
      const MIN_STOCK = 50;
      const lowStockItems = safeMeds.filter(m => m.available_quantity < MIN_STOCK).length;
      
      const today = new Date();
      const expiringSoon = safeMeds.filter(m => {
        const expiry = new Date(m.expiry_date);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 90;
      }).length;

      // Calculate Sales Stats
      const totalRevenue = safeSales.reduce((acc, sale) => acc + parseFloat(sale.total_amount || 0), 0);
      const totalItemsSold = safeIncludes.reduce((acc, inc) => acc + parseInt(inc.quantity || 0), 0);

      setStats({
        totalMedicines,
        lowStockItems,
        expiringSoon,
        salesThisMonth: totalRevenue.toFixed(2), // Simplify to just show all-time as month for mock
        totalRevenue: totalRevenue.toFixed(2),
        totalItemsSold
      });
      
      setRecentSales(safeSales.slice(0, 5)); // Just take the 5 most recent
      
      // Chart Data Generation (Last 7 days)
      const last7Days = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { name: d.toLocaleDateString('en-US', {weekday: 'short'}), revenue: 0, rawDate: d.toISOString().split('T')[0] };
      });
      
      safeSales.forEach(sale => {
         const dayMatch = last7Days.find(d => typeof sale.sale_date === 'string' && sale.sale_date.startsWith(d.rawDate));
         if (dayMatch) {
            dayMatch.revenue += parseFloat(sale.total_amount || 0);
         }
      });
      
      setChartData(last7Days);
      setIsLoaded(true);
  };

  useEffect(() => {
    loadDashboardData();

    // Subscribe to realtime database changes for live dashboard!
    const channel = supabase.channel('realtime_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, payload => {
          loadDashboardData(); // Refresh immediately on new sale
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase' }, payload => {
          loadDashboardData(); // Refresh immediately on new purchase
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine' }, payload => {
          loadDashboardData(); // Refresh on inventory change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading realtime analytics from Database...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="mb-6" style={{ color: '#666' }}>Welcome back, {role || 'User'}. Here is today's overview from the Database.</p>
      
      {/* Alert Banners for Admin/Pharmacist */}
      {(role === 'Admin' || role === 'Pharmacist' || role === 'Staff') && (
        <div className="mb-6 grid gap-2">
          {stats.lowStockItems > 0 && (
            <div style={{ backgroundColor: 'var(--color-warning)', color: '#7A5A00', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '14px' }}>
              <strong>LOW STOCK:</strong> {stats.lowStockItems} medicines are currently below their minimum stock threshold (50 qty). <Link href="/medicines" style={{textDecoration: 'underline', fontWeight: 'bold'}}>Review and Restock →</Link>
            </div>
          )}
          {stats.expiringSoon > 0 && (
            <div style={{ backgroundColor: 'rgba(255, 107, 107, 0.15)', color: 'var(--color-danger)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '14px' }}>
              <strong>EXPIRING SOON:</strong> {stats.expiringSoon} medicines are expiring within the next 90 days. <Link href="/medicines" style={{textDecoration: 'underline', fontWeight: 'bold'}}>Review Now →</Link>
            </div>
          )}
        </div>
      )}

      {/* Admin Specific Statistics Panel */}
      {role === 'Admin' && (
        <div style={{ background: 'var(--color-primary)', color: 'white', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <div className="flex items-center gap-2 mb-4">
             <ShieldCheck size={24} />
             <h2 style={{ margin: 0, color: 'white' }}>Admin Intelligence</h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
             <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '5px' }}>Total Revenue (All Time)</p>
                <div className="flex items-center gap-2">
                   <DollarSign size={20} />
                   <span style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{stats.totalRevenue}</span>
                </div>
             </div>
             <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '5px' }}>Total Units Sold</p>
                <div className="flex items-center gap-2">
                   <Package size={20} />
                   <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalItemsSold}</span>
                </div>
             </div>
             <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '5px' }}>Team Status</p>
                <div className="flex items-center gap-2">
                   <Activity size={20} />
                   <span style={{ fontSize: '24px', fontWeight: 'bold' }}>Operational</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Content Grid: Charts and Stats */}
      {role === 'Admin' && (
        <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
          {/* Revenue Chart */}
          <div className="card">
            <h3 className="mb-4" style={{ color: 'var(--color-primary)' }}>Sales Revenue (Last 7 Days)</h3>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} tickFormatter={(value) => `₹${value}`} />
                  <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-success)" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats Column */}
          <div className="flex flex-col gap-4">
            <div className="card flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <h3 style={{ color: '#888', fontSize: '14px', margin: 0 }}>Active Medicines</h3>
                <span style={{ fontSize: '20px' }}>💊</span>
              </div>
              <div className="flex items-end gap-2">
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-primary)', lineHeight: 1 }}>{stats.totalMedicines}</span>
                <span className="pill pill-success" style={{ marginBottom: '4px' }}>Live in DB</span>
              </div>
            </div>
            
            <div className="card flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <h3 style={{ color: '#888', fontSize: '14px', margin: 0 }}>All Time Revenue</h3>
                <span style={{ fontSize: '20px' }}>💰</span>
              </div>
              <div className="flex items-end gap-2">
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-primary)', lineHeight: 1 }}>₹{stats.totalRevenue}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Recent Sales Ledger */}
      <div className="card">
         <div className="flex justify-between items-center mb-4">
            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Sales Ledger</h3>
            <Link href="/sales" className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}>New Sale</Link>
         </div>
         <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', minWidth: '600px' }}>
             <thead>
               <tr>
                 <th>Date</th>
                 <th>DB Sale ID</th>
                 <th>Customer</th>
                 <th>Total Amount</th>
                 <th>Status</th>
               </tr>
             </thead>
             <tbody>
               {recentSales.length === 0 ? (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                     No recent sales found in Database. Go to the Sales tab to log a transaction!
                   </td>
                 </tr>
               ) : recentSales.map((sale, idx) => {
                 let custName = "Unknown";
                 if (sale.customer && sale.customer.name) custName = sale.customer.name;
                 
                 return (
                   <tr key={idx}>
                     <td>{sale.sale_date}</td>
                     <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>SALE-{sale.sale_id}</td>
                     <td>{custName}</td>
                     <td style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>₹{parseFloat(sale.total_amount || 0).toFixed(2)}</td>
                     <td><span className="pill pill-success">Completed</span></td>
                   </tr>
                 )
               })}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
