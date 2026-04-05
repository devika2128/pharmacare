"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { FileText, Download, BarChart2, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ReportsPage() {
  const [salesData, setSalesData] = useState([]);
  const [purchasesData, setPurchasesData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [reportType, setReportType] = useState('sales');

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesRes, purRes, medRes, custRes, supRes] = await Promise.all([
          supabase.from('sales').select('*').order('sale_date', { ascending: false }).limit(50),
          supabase.from('purchase').select('*').order('purchase_date', { ascending: false }).limit(50),
          supabase.from('medicine').select('*'),
          supabase.from('customer').select('*'),
          supabase.from('supplier').select('*')
        ]);

        if (salesRes.error) console.error("Sales error:", salesRes.error.message);
        if (purRes.error) console.error("Purchase error:", purRes.error.message);

        const customers = custRes.data || [];
        const suppliers = supRes.data || [];

        if (salesRes.data) {
           const enrichedSales = salesRes.data.map(sale => {
              const cust = customers.find(c => c.customer_id === sale.customer_id);
              return { ...sale, customer_name: cust ? cust.name : 'Walk-in' }
           });
           setSalesData(enrichedSales);
        }

        if (purRes.data) {
           const enrichedPurchases = purRes.data.map(pur => {
              const supp = suppliers.find(s => s.supplier_id === pur.supplier_id);
              return { ...pur, supplier_name: supp ? (supp.name || supp.Name) : 'N/A' }
           });
           setPurchasesData(enrichedPurchases);
        }

        if (medRes.data) {
           const lowStock = medRes.data
              .filter(med => med.available_quantity <= (med.min_threshold ?? 50))
              .sort((a, b) => a.available_quantity - b.available_quantity)
              .slice(0, 50);
           setStockData(lowStock);
        }
      } catch (err) {
        console.error("Error fetching report data", err);
      } finally {
        setIsLoaded(true);
      }
    }
    
    fetchData();

    // Subscribe to realtime changes
    const reportsChannel = supabase.channel('realtime_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine' }, () => fetchData())
      .subscribe();

    return () => {
       supabase.removeChannel(reportsChannel);
    };
  }, []);

  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (reportType === 'sales') {
      csvContent += "Sale ID,Date,Total Amount,Customer Name\n";
      salesData.forEach(row => {
        csvContent += `${row.sale_id},${row.sale_date},${row.total_amount || row.Total_amount},${row.customer_name}\n`;
      });
    } else if (reportType === 'purchases') {
      csvContent += "Purchase ID,Date,Price,Quantity,Supplier Name\n";
      purchasesData.forEach(row => {
        csvContent += `${row.purchase_id},${row.purchase_date},${row.purchase_price},${row.quantity},${row.supplier_name}\n`;
      });
    } else if (reportType === 'inventory') {
      csvContent += "Medicine ID,Name,Category,Available Quantity,Price\n";
      stockData.forEach(row => {
        csvContent += `${row.medicine_id},${row.name},${row.category},${row.available_quantity},${row.price}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading reports...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>System Reports</h1>
          <p style={{ color: '#666' }}>Generate and export business data analysis.</p>
        </div>
        <button className="btn btn-primary" onClick={downloadCSV}>
          <Download size={18} /> Export as CSV
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => setReportType('sales')}
          className={`btn ${reportType === 'sales' ? 'btn-primary' : 'btn-outline'}`}
        >
          <TrendingUp size={16} /> Sales Report
        </button>
        <button 
          onClick={() => setReportType('purchases')}
          className={`btn ${reportType === 'purchases' ? 'btn-primary' : 'btn-outline'}`}
        >
          <BarChart2 size={16} /> Purchase Report
        </button>
        <button 
          onClick={() => setReportType('inventory')}
          className={`btn ${reportType === 'inventory' ? 'btn-primary' : 'btn-outline'}`}
        >
          <AlertTriangle size={16} /> Low Stock Report
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} className="text-primary" /> 
          {reportType === 'sales' ? 'Recent Sales Activity' : 
           reportType === 'purchases' ? 'Recent Purchases' : 
           'Inventory Alerts (Low Stock)'}
        </h2>
        
        <table style={{ width: '100%', minWidth: '600px' }}>
          <thead>
            {reportType === 'sales' && (
              <tr>
                <th>TxD</th>
                <th>Date</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
              </tr>
            )}
            {reportType === 'purchases' && (
              <tr>
                <th>PO #</th>
                <th>Date</th>
                <th>Supplier</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Price</th>
              </tr>
            )}
            {reportType === 'inventory' && (
              <tr>
                <th>Med ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Available</th>
                <th style={{ textAlign: 'right' }}>Price</th>
              </tr>
            )}
          </thead>
          <tbody>
            {reportType === 'sales' && salesData.map(sale => (
               <tr key={sale.sale_id}>
                 <td>#{sale.sale_id}</td>
                 <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                 <td>{sale.customer_name}</td>
                 <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{sale.total_amount || sale.Total_amount}</td>
               </tr>
            ))}
            {reportType === 'purchases' && purchasesData.map(pur => (
               <tr key={pur.purchase_id}>
                 <td>#{pur.purchase_id}</td>
                 <td>{new Date(pur.purchase_date).toLocaleDateString()}</td>
                 <td>{pur.supplier_name}</td>
                 <td style={{ textAlign: 'right' }}>{pur.quantity}</td>
                 <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{pur.purchase_price}</td>
               </tr>
            ))}
            {reportType === 'inventory' && stockData.map(med => (
               <tr key={med.medicine_id}>
                 <td>#{med.medicine_id}</td>
                 <td style={{ fontWeight: 600 }}>{med.name}</td>
                 <td>{med.category}</td>
                 <td>
                   <span style={{ 
                     color: med.available_quantity <= (med.min_threshold ?? 50) ? 'red' : 'inherit',
                     fontWeight: med.available_quantity <= (med.min_threshold ?? 50) ? 'bold' : 'normal' 
                   }}>
                     {med.available_quantity}
                   </span>
                 </td>
                 <td style={{ textAlign: 'right' }}>₹{med.price}</td>
               </tr>
            ))}
            {(reportType === 'sales' && salesData.length === 0 || 
              reportType === 'purchases' && purchasesData.length === 0 || 
              reportType === 'inventory' && stockData.length === 0) && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No records to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
