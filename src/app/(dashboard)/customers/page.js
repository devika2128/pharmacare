"use client";

import { useState, useEffect } from 'react';
import { Plus, Search, ShoppingBag } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newCust, setNewCust] = useState({ name: '', phone_number: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('customer').select('*').order('customer_id', { ascending: false });
      if (data) setCustomers(data);
      if (error) console.error(error);
      setIsLoaded(true);
    }
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (newCust.name) {
      setIsSubmitting(true);
      const { data, error } = await supabase.from('customer').insert([{
        name: newCust.name,
        phone_number: newCust.phone_number || null,
        address: newCust.address || null
      }]).select();

      if (!error && data) {
        setCustomers([data[0], ...customers]);
        setShowAdd(false);
        setNewCust({ name: '', phone_number: '', address: '' });
      } else {
        alert("Error: " + error?.message);
      }
      setIsSubmitting(false);
    } else {
      alert("Customer Name is required.");
    }
  };

  const handleEditClick = (cust) => {
    setEditingId(cust.customer_id);
    setEditForm({ ...cust });
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase.from('customer')
      .update({
        name: editForm.name,
        phone_number: editForm.phone_number,
        address: editForm.address
      })
      .eq('customer_id', editingId)
      .select();

    if (!error && data) {
      setCustomers(customers.map(c => c.customer_id === editingId ? data[0] : c));
      setEditingId(null);
    } else {
      alert("Error: " + error?.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (confirm("Delete customer? This is permanent.")) {
      const { error } = await supabase.from('customer').delete().eq('customer_id', id);
      if (!error) {
        setCustomers(customers.filter(c => c.customer_id !== id));
      } else {
        alert("Cannot delete. " + error.message);
      }
    }
  };
  
  const handleViewHistory = async (cust) => {
     setShowHistoryModal(cust);
     setIsLoadingHistory(true);
     setCustomerSales([]); // clear previous
     
     // Fetch accurate sales for this customer
     // We fetch sales, and inner join the includes and medicine tables through PostgREST nested joins
     const { data, error } = await supabase.from('sales')
        .select(`
           sale_id, sale_date, total_amount,
           includes (
              quantity,
              medicine ( name, price )
           )
        `)
        .eq('customer_id', cust.customer_id)
        .order('sale_date', { ascending: false });
        
     if (error) {
        console.error("Error fetching history:", error);
     } else if (data) {
        setCustomerSales(data);
     }
     setIsLoadingHistory(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.phone_number && c.phone_number.includes(searchQuery))
  );

  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading customers from DB...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Customer Management</h1>
          <p style={{ color: '#666' }}>View Customer directory from database.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} disabled={isSubmitting}>
          <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Customer'}
        </button>
      </div>
      
      <div className="card">
        <div className="flex justify-between items-center mb-4">
           <div style={{ position: 'relative' }}>
             <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '10px' }} />
             <input 
               type="text" 
               placeholder="Search customers..." 
               style={{ paddingLeft: '32px', width: '250px' }} 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>CUST ID</th>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>History</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                <td><span style={{ fontSize: '12px', color: '#888' }}>DB Auto</span></td>
                <td>
                  <input type="text" placeholder="Full Name" value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} />
                </td>
                <td>
                  <input type="text" placeholder="Phone" value={newCust.phone_number} onChange={e => setNewCust({...newCust, phone_number: e.target.value})} style={{ width: '150px' }} />
                </td>
                <td>
                   <input type="text" placeholder="Address" value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} />
                </td>
                <td>-</td>
                <td>
                  <button className="btn btn-success" onClick={handleAdd} disabled={isSubmitting} style={{ padding: '6px 12px', fontSize: '12px' }}>{isSubmitting ? 'Saving' : 'Save Data'}</button>
                </td>
              </tr>
            )}
            
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No customers found in Database.
                </td>
              </tr>
            ) : filteredCustomers.map(cust => {
              const isEditing = editingId === cust.customer_id;
              
              if (isEditing) {
                return (
                  <tr key={cust.customer_id} style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                    <td style={{ fontWeight: 600 }}>CUST-{cust.customer_id}</td>
                    <td><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td><input type="text" value={editForm.phone_number || ''} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} style={{ width: '150px' }} /></td>
                    <td><input type="text" value={editForm.address || ''} onChange={e => setEditForm({...editForm, address: e.target.value})} /></td>
                    <td>-</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-success" onClick={handleSaveEdit} disabled={isSubmitting} style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--color-success)', color: 'white' }}>Save</button>
                        <button className="btn btn-outline" onClick={() => setEditingId(null)} style={{ padding: '4px 8px', fontSize: '11px' }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={cust.customer_id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>CUST-{cust.customer_id}</td>
                  <td style={{ fontWeight: 600 }}>{cust.name}</td>
                  <td>{cust.phone_number || '-'}</td>
                  <td>{cust.address || '-'}</td>
                  <td>
                    <button className="btn btn-outline flex items-center gap-2" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleViewHistory(cust)}>
                       <ShoppingBag size={12} /> View Records
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => handleEditClick(cust)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => handleDelete(cust.customer_id)} style={{ padding: '4px 8px', fontSize: '11px', color: '#ff6b6b', borderColor: '#ff6b6b' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div className="card" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#fff', padding: '2rem' }}>
              <div className="flex justify-between items-center mb-6" style={{ borderBottom: '2px solid #ddd', paddingBottom: '1rem' }}>
                 <h2 style={{ margin: 0 }}>Receipts: {showHistoryModal.name}</h2>
                 <button onClick={() => setShowHistoryModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
              </div>
              
              {isLoadingHistory ? (
                 <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Loading secure records from DB...</div>
              ) : customerSales.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No recorded sales for this customer.</div>
              ) : (
                 <div className="grid gap-4">
                    {customerSales.map((sale, i) => {
                       return (
                          <div key={i} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', backgroundColor: '#f9f9f9' }}>
                             <div className="flex justify-between mb-2">
                                <strong>Receipt ID: SALE-{sale.sale_id}</strong>
                                <span style={{ color: '#666', fontSize: '12px' }}>{sale.sale_date}</span>
                             </div>
                             
                             {/* Loop through medicine included in this sale */}
                             {sale.includes && sale.includes.map((incItem, j) => (
                               <div key={j} className="mt-2" style={{ borderTop: '1px dashed #ddd', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                 <div>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{incItem.medicine?.name || 'Unknown Medicine'}</span> <br/>
                                    <span style={{ fontSize: '13px', color: '#666' }}>Dispensed Quantity: {incItem.quantity} units</span>
                                 </div>
                               </div>
                             ))}
                             
                             <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '2px solid #e0dcd6' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Total Bill:</span>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                                   ₹{parseFloat(sale.total_amount || 0).toFixed(2)}
                                </div>
                             </div>
                          </div>
                       )
                    })}
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
