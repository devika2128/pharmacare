"use client";

import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newSupp, setNewSupp] = useState({ name: '', contact_number: '', address: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('supplier').select('*').order('supplier_id', { ascending: false });
      if (data) setSuppliers(data);
      if (error) console.error(error);
      setIsLoaded(true);
    }
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (newSupp.name) {
      setIsSubmitting(true);
      const { data, error } = await supabase.from('supplier').insert([{
        name: newSupp.name,
        contact_number: newSupp.contact_number,
        address: newSupp.address
      }]).select();

      if (!error && data) {
        setSuppliers([data[0], ...suppliers]);
        setShowAdd(false);
        setNewSupp({ name: '', contact_number: '', address: '' });
      } else {
        alert("Error: " + error?.message);
      }
      setIsSubmitting(false);
    } else {
      alert("Supplier Name is required.");
    }
  };

  const handleEditClick = (supp) => {
    setEditingId(supp.supplier_id);
    setEditForm({ ...supp });
  };

  const handleSaveEdit = async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase.from('supplier')
      .update({
        name: editForm.name,
        contact_number: editForm.contact_number,
        address: editForm.address
      })
      .eq('supplier_id', editingId).select();

    if (!error && data) {
      setSuppliers(suppliers.map(s => s.supplier_id === editingId ? data[0] : s));
      setEditingId(null);
    } else {
      alert("Error: " + error?.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      const { error } = await supabase.from('supplier').delete().eq('supplier_id', id);
      if (!error) {
        setSuppliers(suppliers.filter(s => s.supplier_id !== id));
      } else {
        alert("Cannot delete. It may be linked to existing purchases.");
      }
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.contact_number && s.contact_number.includes(searchQuery))
  );

  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading suppliers from DB...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Supplier Management</h1>
          <p style={{ color: '#666' }}>Manage suppliers directly in Database.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} disabled={isSubmitting}>
          <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Supplier'}
        </button>
      </div>
      
      <div className="card">
        <div className="flex justify-between items-center mb-4">
           <div style={{ position: 'relative' }}>
             <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '10px' }} />
             <input 
               type="text" 
               placeholder="Search suppliers..." 
               style={{ paddingLeft: '32px', width: '250px' }} 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Supplier ID</th>
              <th>Company Name</th>
              <th>Contact Number</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                <td><span style={{ fontSize: '12px', color: '#888' }}>DB Auto</span></td>
                <td>
                  <input type="text" placeholder="Company Name" value={newSupp.name} onChange={e => setNewSupp({...newSupp, name: e.target.value})} />
                </td>
                <td>
                  <input type="text" placeholder="Contact" value={newSupp.contact_number} onChange={e => setNewSupp({...newSupp, contact_number: e.target.value})} style={{ width: '150px' }} />
                </td>
                <td>
                   <input type="text" placeholder="Address" value={newSupp.address} onChange={e => setNewSupp({...newSupp, address: e.target.value})} />
                </td>
                <td>
                  <button className="btn btn-success" onClick={handleAdd} disabled={isSubmitting} style={{ padding: '6px 12px', fontSize: '12px' }}>{isSubmitting ? 'Saving...' : 'Save Data'}</button>
                </td>
              </tr>
            )}
            
            {filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No suppliers found in Database.
                </td>
              </tr>
            ) : filteredSuppliers.map(supp => {
              const isEditing = editingId === supp.supplier_id;
              
              if (isEditing) {
                return (
                  <tr key={supp.supplier_id} style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                    <td style={{ fontWeight: 600 }}>SUPP-{supp.supplier_id}</td>
                    <td><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td><input type="text" value={editForm.contact_number} onChange={e => setEditForm({...editForm, contact_number: e.target.value})} style={{ width: '150px' }} /></td>
                    <td><input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} /></td>
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
                <tr key={supp.supplier_id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>SUPP-{supp.supplier_id}</td>
                  <td style={{ fontWeight: 600 }}>{supp.name}</td>
                  <td>{supp.contact_number || '-'}</td>
                  <td>{supp.address || '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => handleEditClick(supp)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => handleDelete(supp.supplier_id)} style={{ padding: '4px 8px', fontSize: '11px', color: '#ff6b6b', borderColor: '#ff6b6b' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
