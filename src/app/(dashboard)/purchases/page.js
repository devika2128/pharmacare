"use client";

import { useState, useEffect } from 'react';
import { Truck, Search, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export default function PurchasesPage() {
  const { role } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [employees, setEmployees] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ 
    purchase_date: '', 
    purchase_price: '', 
    supplier_id: '', 
    employee_id: '', 
    items: [{ medicine_id: '', quantity: '' }]
  });

  useEffect(() => {
    async function fetchData() {
      const [purRes, pcRes, empRes, supRes, medRes] = await Promise.all([
        supabase.from('purchase').select('*').order('purchase_date', { ascending: false }),
        supabase.from('purchase_contains').select('*'),
        supabase.from('employee').select('*'),
        supabase.from('supplier').select('*'),
        supabase.from('medicine').select('*')
      ]);

      if (purRes.data) {
         if (pcRes.data) {
             const mergedPurchases = purRes.data.map(p => ({
                 ...p,
                 items: pcRes.data.filter(pc => pc.purchase_id === p.purchase_id)
             }));
             setPurchases(mergedPurchases);
         } else {
             setPurchases(purRes.data.map(p => ({ ...p, items: [] })));
         }
      }

      if (empRes.data) setEmployees(empRes.data);
      if (supRes.data) setSuppliers(supRes.data);
      if (medRes.data) setMedicines(medRes.data);

      setNewPurchase(prev => ({ ...prev, purchase_date: new Date().toISOString().split('T')[0] }));
      setIsLoaded(true);
    }
    
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (newPurchase.purchase_price && newPurchase.supplier_id && newPurchase.employee_id && newPurchase.items.length > 0 && newPurchase.items[0].medicine_id) {
      setIsSubmitting(true);
      
      const purchaseData = {
        purchase_date: newPurchase.purchase_date,
        purchase_price: parseFloat(newPurchase.purchase_price),
        supplier_id: parseInt(newPurchase.supplier_id),
        employee_id: parseInt(newPurchase.employee_id)
      };
      
      const { data, error } = await supabase.from('purchase').insert([purchaseData]).select('*');
      
      if (error) {
         console.error(error);
         alert("Error adding purchase to database: " + error.message);
         setIsSubmitting(false);
         return;
      }
      
      const pId = data[0].purchase_id;
      const containsData = newPurchase.items.filter(i => i.medicine_id && i.quantity).map(item => ({
         purchase_id: pId,
         medicine_id: parseInt(item.medicine_id),
         quantity: parseInt(item.quantity)
      }));

      if (containsData.length > 0) {
          await supabase.from('purchase_contains').insert(containsData);
      }
      
      const targetMeds = [...medicines];
      for (const item of containsData) {
         const mIdx = targetMeds.findIndex(m => m.medicine_id === item.medicine_id);
         if (mIdx !== -1) {
            targetMeds[mIdx] = { ...targetMeds[mIdx], available_quantity: targetMeds[mIdx].available_quantity + item.quantity };
         }
      }
      setMedicines(targetMeds);

      setPurchases([{ ...data[0], items: containsData }, ...purchases]);
      setShowAdd(false);
      setNewPurchase({ purchase_date: new Date().toISOString().split('T')[0], purchase_price: '', supplier_id: '', employee_id: '', items: [{ medicine_id: '', quantity: '' }] });
      setIsSubmitting(false);
      
      alert("Purchase recorded and Medicine stock updated!");
    } else {
      alert("Please fill all required relationship fields.");
    }
  };

  if (!isLoaded) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Purchase History</h1>
          <p style={{ color: '#666' }}>Review supplier restock purchases directly from Database.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} disabled={isSubmitting}>
          <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Purchase'}
        </button>
      </div>
      
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th>Purchase ID</th>
              <th>Date</th>
              <th>Total Price</th>
              <th>Supplier</th>
              <th>Authorized By (Emp)</th>
              <th>Medicines</th>
              {showAdd && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                <td><span style={{ fontSize: '12px', color: '#888' }}>DB Auto</span></td>
                <td><input type="date" value={newPurchase.purchase_date} onChange={e => setNewPurchase({...newPurchase, purchase_date: e.target.value})} style={{ width: '110px' }} /></td>
                <td><input type="number" step="0.01" placeholder="₹ Total Price" value={newPurchase.purchase_price} onChange={e => setNewPurchase({...newPurchase, purchase_price: e.target.value})} style={{ width: '90px' }} /></td>
                <td>
                  <select value={newPurchase.supplier_id} onChange={e => setNewPurchase({...newPurchase, supplier_id: e.target.value})} style={{ padding: '6px', width: '130px' }}>
                    <option value="">-- Select --</option>
                    {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={newPurchase.employee_id} onChange={e => setNewPurchase({...newPurchase, employee_id: e.target.value})} style={{ padding: '6px', width: '130px' }}>
                    <option value="">-- Select --</option>
                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.fname} {e.lname}</option>)}
                  </select>
                </td>
                <td>
                   {newPurchase.items.map((it, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                         <select value={it.medicine_id} onChange={e => {
                            const newItems = [...newPurchase.items];
                            newItems[idx].medicine_id = e.target.value;
                            setNewPurchase({...newPurchase, items: newItems});
                         }} style={{ padding: '4px', width: '100px' }}>
                            <option value="">Med</option>
                            {medicines.map(m => <option key={m.medicine_id} value={m.medicine_id}>{m.name}</option>)}
                         </select>
                         <input type="number" placeholder="Qty" value={it.quantity} onChange={e => {
                            const newItems = [...newPurchase.items];
                            newItems[idx].quantity = e.target.value;
                            setNewPurchase({...newPurchase, items: newItems});
                         }} style={{ width: '60px' }} />
                      </div>
                   ))}
                   <button className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => setNewPurchase({...newPurchase, items: [...newPurchase.items, { medicine_id: '', quantity: '' }]})}>+ Item</button>
                </td>
                <td>
                  <button className="btn btn-success" onClick={handleAdd} disabled={isSubmitting} style={{ padding: '6px 12px', fontSize: '12px' }}>{isSubmitting ? 'Saving...' : 'Save Data'}</button>
                </td>
              </tr>
            )}
            
            {purchases.map(p => {
               const supp = suppliers.find(s => s.supplier_id === p.supplier_id);
               const emp = employees.find(e => e.employee_id === p.employee_id);
               
               return (
                 <tr key={p.purchase_id}>
                   <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>PUR-{p.purchase_id}</td>
                   <td>{p.purchase_date}</td>
                   <td style={{ fontWeight: 600 }}>₹{parseFloat(p.purchase_price).toFixed(2)}</td>
                   <td>{supp ? supp.name : `SUPP-${p.supplier_id}`}</td>
                   <td>{emp ? `${emp.fname} ${emp.lname}` : `EMP-${p.employee_id}`}</td>
                   <td>
                     {p.items && p.items.length > 0 ? p.items.map((it, i) => {
                        const m = medicines.find(med => med.medicine_id === it.medicine_id);
                        return <div key={i} style={{ fontSize: '12px' }}>{m ? m.name : `MED-${it.medicine_id}`} x {it.quantity}</div>;
                     }) : <span style={{ color: '#888', fontSize: '12px' }}>No items</span>}
                   </td>
                   {showAdd && <td></td>}
                 </tr>
               );
            })}
            
            {purchases.length === 0 && !showAdd && (
              <tr>
                <td colSpan="7" className="text-center" style={{ padding: '2rem', color: '#888' }}>
                  No purchases found in Database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
