"use client";

import { useState, useEffect } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export default function MedicinesPage() {
  const { role } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [newMed, setNewMed] = useState({ 
    name: '', 
    category: '', 
    batch_number: '', 
    expiry_date: '', 
    price: '', 
    available_quantity: '',
    min_threshold: 50,
    substitutes: ''
  });

  useEffect(() => {
    async function fetchData() {
      const [{ data, error }, { data: subData }] = await Promise.all([
        supabase.from('medicine').select('*').order('medicine_id', { ascending: false }),
        supabase.from('is_substitute').select('*')
      ]);
      if (data) {
        setMedicines(data.map(m => {
          const subs = (subData || []).filter(s => s.medicine_id === m.medicine_id).map(s => s.substitute_medicine_id);
          return { ...m, substitutes: subs.join(", ") };
        }));
      }
      if (error) console.error(error);
      setIsLoaded(true);
    }
    fetchData();
  }, []);

  const handleEditClick = (med) => {
    setEditingId(med.medicine_id);
    setEditForm({ ...med });
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    const { data, error } = await supabase.from('medicine')
      .update({
        name: editForm.name,
        category: editForm.category || null,
        batch_number: editForm.batch_number,
        expiry_date: editForm.expiry_date,
        price: parseFloat(editForm.price),
        available_quantity: parseInt(editForm.available_quantity),
        min_threshold: parseInt(editForm.min_threshold) || 50,
        requires_prescription: !!editForm.requires_prescription
      })
      .eq('medicine_id', editingId)
      .select();

    if (!error && data) {
      // Handle substitutes
      await supabase.from('is_substitute').delete().eq('medicine_id', editingId);
      const subIds = (editForm.substitutes || '').split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
      if (subIds.length > 0) {
        await supabase.from('is_substitute').insert(subIds.map(subId => ({
          medicine_id: editingId,
          substitute_medicine_id: subId
        })));
      }

      setMedicines(medicines.map(m => m.medicine_id === editingId ? { ...data[0], substitutes: subIds.join(', ') } : m));
      setEditingId(null);
    } else {
      alert("Error saving: " + error?.message);
    }
    setIsSubmitting(false);
  };
  
  const handleAddNew = async () => {
    if (newMed.name && newMed.price && newMed.available_quantity) {
       setIsSubmitting(true);

       const { data, error } = await supabase.from('medicine').insert([{
         name: newMed.name,
         category: newMed.category || null,
         batch_number: newMed.batch_number || null,
         expiry_date: newMed.expiry_date,
         price: parseFloat(newMed.price),
         available_quantity: parseInt(newMed.available_quantity) || 0,
         min_threshold: parseInt(newMed.min_threshold) || 50,
         requires_prescription: !!newMed.requires_prescription
       }]).select();

       if (!error && data) {
         const newId = data[0].medicine_id;
         const subIds = (newMed.substitutes || '').split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s));
         if (subIds.length > 0) {
            await supabase.from('is_substitute').insert(subIds.map(subId => ({
              medicine_id: newId,
              substitute_medicine_id: subId
            })));
         }

         setMedicines([{...data[0], substitutes: subIds.join(', ')}, ...medicines]);
         setShowAdd(false);
         setNewMed({ name: '', category: '', batch_number: '', expiry_date: '', price: '', available_quantity: '', min_threshold: 50, substitutes: '', requires_prescription: false });
       } else {
         alert("Error adding medication: " + error?.message);
       }
       setIsSubmitting(false);
    } else {
      alert("Name, Expiry, Price and Quantity are required.");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this medicine? This will fail if it is linked to previous purchases or sales.")) {
      const { error } = await supabase.from('medicine').delete().eq('medicine_id', id);
      if (!error) {
        setMedicines(medicines.filter(m => m.medicine_id !== id));
      } else {
        alert("Cannot delete medicine: " + error.message);
      }
    }
  };
  
  const getStatus = (med) => {
    const today = new Date();
    const expiry = new Date(med.expiry_date);
    const minThresh = med.min_threshold || 50;
    
    if (expiry < today) return { label: 'Expired', class: 'pill-danger' };
    if (med.available_quantity <= minThresh) return { label: 'Low Stock', class: 'pill-warning' };
    return { label: 'In Stock', class: 'pill-success' };
  };

  const filteredMedicines = medicines.filter(med => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatches = med.name ? med.name.toLowerCase().includes(searchLower) : false;
    const batchMatches = med.batch_number ? med.batch_number.toLowerCase().includes(searchLower) : false;
    const matchesSearch = nameMatches || batchMatches;
    if (!matchesSearch) return false;

    const status = getStatus(med).label;
    if (filter === 'All') return true;
    if (filter === 'Expiring') {
        const today = new Date();
        const expiry = new Date(med.expiry_date);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return status !== 'Expired' && diffDays > 0 && diffDays <= 90;
    }
    return status === filter;
  });

  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading medicines from DB...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Medicine Inventory</h1>
          <p style={{ color: '#666' }}>Manage database medicine records and stock levels.</p>
        </div>
        {role !== 'Staff' && (
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} disabled={isSubmitting}>
            <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Medicine'}
          </button>
        )}
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
           <div className="flex gap-2">
             {['All', 'In Stock', 'Expiring', 'Low Stock', 'Expired'].map(f => (
               <button 
                 key={f} 
                 className={`pill ${filter === f ? 'pill-info' : ''}`}
                 style={{ 
                   cursor: 'pointer', 
                   border: filter === f ? 'none' : '1px solid #ddd',
                   background: filter === f ? 'var(--color-primary)' : 'transparent',
                   color: filter === f ? 'white' : '#666',
                   padding: '4px 12px'
                 }}
                 onClick={() => setFilter(f)}
               >
                 {f}
               </button>
             ))}
           </div>
           
           <div style={{ position: 'relative' }}>
             <Search size={16} color="#888" style={{ position: 'absolute', left: '10px', top: '10px' }} />
             <input 
               type="text" 
               placeholder="Search medicines..." 
               style={{ paddingLeft: '32px', width: '250px' }} 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>

        {/* Table */}
        <table style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th>Med ID</th>
              <th>Medicine</th>
              <th>Category</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Price</th>
              <th>Qty (Min)</th>
              <th>Substitutes DB IDs</th>
              <th>Status</th>
              {role !== 'Staff' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                <td><span style={{ fontSize: '12px', color: '#888' }}>DB Auto</span></td>
                <td><input type="text" placeholder="Name" value={newMed.name} onChange={e => setNewMed({...newMed, name: e.target.value})} /></td>
                <td><input type="text" placeholder="Category" value={newMed.category} onChange={e => setNewMed({...newMed, category: e.target.value})} style={{ width: '100px' }} /></td>
                <td><input type="text" placeholder="Batch" value={newMed.batch_number} onChange={e => setNewMed({...newMed, batch_number: e.target.value})} style={{ width: '80px' }}/></td>
                <td><input type="date" value={newMed.expiry_date} onChange={e => setNewMed({...newMed, expiry_date: e.target.value})} /></td>
                <td><input type="number" step="0.01" placeholder="Price" value={newMed.price} onChange={e => setNewMed({...newMed, price: e.target.value})} style={{ width: '80px' }}/></td>
                <td>
                   <input type="number" placeholder="Qty" value={newMed.available_quantity} onChange={e => setNewMed({...newMed, available_quantity: e.target.value})} style={{ width: '60px', marginBottom: '4px', display: 'block' }}/>
                   <input type="number" placeholder="Min" value={newMed.min_threshold} onChange={e => setNewMed({...newMed, min_threshold: e.target.value})} style={{ width: '60px' }}/>
                </td>
                <td>
                   <input type="text" placeholder="1,2,3" value={newMed.substitutes} onChange={e => setNewMed({...newMed, substitutes: e.target.value})} style={{ width: '100px' }} />
                   <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginTop: '4px' }}>
                     <input type="checkbox" checked={newMed.requires_prescription || false} onChange={e => setNewMed({...newMed, requires_prescription: e.target.checked})} />
                     Req Rx
                   </label>
                </td>
                <td>
                   <button className="btn btn-success" onClick={handleAddNew} disabled={isSubmitting} style={{ padding: '6px 12px', fontSize: '12px' }}>{isSubmitting ? 'Saving...' : 'Save Data'}</button>
                </td>
              </tr>
            )}

            {filteredMedicines.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  No medicines found in Database.
                </td>
              </tr>
            ) : filteredMedicines.map(med => {
              const status = getStatus(med);
              const isEditing = editingId === med.medicine_id;
              
              if (isEditing) {
                return (
                  <tr key={med.medicine_id} style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                    <td style={{ fontWeight: 600 }}>MED-{med.medicine_id}</td>
                    <td><input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td><input type="text" value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} style={{ width: '100px' }} /></td>
                    <td><input type="text" value={editForm.batch_number || ''} onChange={e => setEditForm({...editForm, batch_number: e.target.value})} style={{ width: '80px' }}/></td>
                    <td><input type="date" value={editForm.expiry_date} onChange={e => setEditForm({...editForm, expiry_date: e.target.value})} /></td>
                    <td><input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} style={{ width: '80px' }}/></td>
                    <td>
                       <input type="number" value={editForm.available_quantity} onChange={e => setEditForm({...editForm, available_quantity: e.target.value})} style={{ width: '60px', marginBottom: '4px', display: 'block' }}/>
                       <input type="number" value={editForm.min_threshold || ''} placeholder="Min" onChange={e => setEditForm({...editForm, min_threshold: e.target.value})} style={{ width: '60px' }}/>
                    </td>
                    <td>
                       <input type="text" placeholder="IDs: 1,2" value={editForm.substitutes || ''} onChange={e => setEditForm({...editForm, substitutes: e.target.value})} style={{ width: '100px' }} />
                       <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginTop: '4px' }}>
                         <input type="checkbox" checked={editForm.requires_prescription || false} onChange={e => setEditForm({...editForm, requires_prescription: e.target.checked})} />
                         Req Rx
                       </label>
                    </td>
                    {role !== 'Staff' && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-success" onClick={handleSave} disabled={isSubmitting} style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--color-success)', color: 'white' }}>Save</button>
                          <button className="btn btn-outline" onClick={() => setEditingId(null)} style={{ padding: '4px 8px', fontSize: '11px' }}>Cancel</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }

              return (
                <tr key={med.medicine_id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>MED-{med.medicine_id}</td>
                  <td>
                     <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                         {med.name}
                         {med.requires_prescription && <span className="pill" style={{ background: '#ffcccb', color: '#cc0000', marginLeft: '6px', fontSize: '9px', padding: '2px 4px' }}>Rx</span>}
                     </div>
                  </td>
                  <td>{med.category || '-'}</td>
                  <td>{med.batch_number || '-'}</td>
                  <td>{med.expiry_date}</td>
                  <td>₹{parseFloat(med.price).toFixed(2)}</td>
                  <td>
                     <span style={{ fontWeight: 'bold' }}>{med.available_quantity}</span>
                     <div style={{ fontSize: '10px', color: '#888' }}>Min: {med.min_threshold || 50}</div>
                  </td>
                  <td>
                     {med.substitutes ? <span style={{ fontSize: '11px', color: '#666' }}>IDs: {med.substitutes}</span> : <span style={{ fontSize: '11px', color: '#aaa' }}>None</span>}
                  </td>
                  <td><span className={`pill ${status.class}`}>{status.label}</span></td>
                  {role !== 'Staff' && (
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-outline" onClick={() => handleEditClick(med)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                        <button className="btn btn-outline" onClick={() => handleDelete(med.medicine_id)} style={{ padding: '4px 8px', fontSize: '11px', color: '#ff6b6b', borderColor: '#ff6b6b' }}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
