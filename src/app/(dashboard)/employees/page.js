"use client";

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/utils/supabase';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newEmp, setNewEmp] = useState({ 
    fname: '', minit: '', lname: '', email: '', password_hash: '', gender: '', salary: '', date_of_joining: '', supervisor_id: '',
    street: '', city: '', stats: '', Zip: ''
  });
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    async function fetchData() {
      const [{ data: empData, error }, { data: addrData }] = await Promise.all([
        supabase.from('employee').select('*').order('employee_id', { ascending: false }),
        supabase.from('address').select('*')
      ]);
      if (empData) {
        const merged = empData.map(e => ({
          ...e,
          address: addrData?.find(a => a.employee_id === e.employee_id) || {}
        }));
        setEmployees(merged);
      }
      if (error) console.error(error);
      setIsLoaded(true);
    }
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (newEmp.fname && newEmp.lname && newEmp.email && newEmp.password_hash) {
      if (employees.some(e => e.email === newEmp.email)) {
        alert("Email ID must be unique!");
        return;
      }
      setIsSubmitting(true);
      
      const payload = {
         fname: newEmp.fname,
         minit: newEmp.minit || null,
         lname: newEmp.lname,
         email: newEmp.email,
         password_hash: newEmp.password_hash,
         gender: newEmp.gender || null,
         salary: newEmp.salary ? parseFloat(newEmp.salary) : null,
         date_of_joining: newEmp.date_of_joining || null,
         supervisor_id: newEmp.supervisor_id ? parseInt(newEmp.supervisor_id) : null
      };

      const { data, error } = await supabase.from('employee').insert([payload]).select();

      if (!error && data) {
        const empId = data[0].employee_id;
        const addrPayload = {
           employee_id: empId,
           street: newEmp.street || null,
           city: newEmp.city || null,
           stats: newEmp.stats || null,
           Zip: newEmp.Zip || null
        };
        await supabase.from('address').insert([addrPayload]);

        const newEmployee = { ...data[0], address: addrPayload };
        setEmployees([newEmployee, ...employees]);
        setShowAdd(false);
        setNewEmp({ fname: '', minit: '', lname: '', email: '', password_hash: '', gender: '', salary: '', date_of_joining: '', supervisor_id: '', street: '', city: '', stats: '', Zip: '' });
      } else {
        alert("Error adding employee: " + error?.message);
      }
      setIsSubmitting(false);
    } else {
      alert("First Name, Last Name, Email, and Password are required.");
    }
  };

  const handleEditClick = (emp) => {
    setEditingId(emp.employee_id);
    setEditForm({ 
      ...emp, 
      street: emp.address?.street || '',
      city: emp.address?.city || '',
      stats: emp.address?.stats || '',
      Zip: emp.address?.Zip || ''
    });
  };

  const handleSaveEdit = async () => {
    if (employees.some(e => e.email === editForm.email && e.employee_id !== editingId)) {
      alert("Email ID must be unique!");
      return;
    }
    setIsSubmitting(true);
    
    const payload = {
         fname: editForm.fname,
         minit: editForm.minit || null,
         lname: editForm.lname,
         email: editForm.email,
         password_hash: editForm.password_hash,
         gender: editForm.gender || null,
         salary: editForm.salary ? parseFloat(editForm.salary) : null,
         date_of_joining: editForm.date_of_joining || null,
         supervisor_id: editForm.supervisor_id ? parseInt(editForm.supervisor_id) : null
    };

    const { data, error } = await supabase.from('employee').update(payload).eq('employee_id', editingId).select();

    if (!error && data) {
      const addrPayload = {
         employee_id: editingId,
         street: editForm.street || null,
         city: editForm.city || null,
         stats: editForm.stats || null,
         Zip: editForm.Zip || null
      };
      
      // Upsert address
      const { data: existingAddr } = await supabase.from('address').select('employee_id').eq('employee_id', editingId);
      if (existingAddr && existingAddr.length > 0) {
         await supabase.from('address').update(addrPayload).eq('employee_id', editingId);
      } else {
         await supabase.from('address').insert([addrPayload]);
      }

      setEmployees(employees.map(e => e.employee_id === editingId ? { ...data[0], address: addrPayload } : e));
      setEditingId(null);
    } else {
      alert("Error updating employee: " + error?.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if(confirm("Are you sure you want to delete this employee? (May fail if linked to sales/purchases)")) {
       const { error } = await supabase.from('employee').delete().eq('employee_id', id);
       if(!error) {
         setEmployees(employees.filter(e => e.employee_id !== id));
       } else {
         alert("Cannot delete employee: " + error.message);
       }
    }
  }

  if (!isLoaded) return <div style={{ padding: '2rem' }}>Loading employees from DB...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Employee Management</h1>
          <p style={{ color: '#666' }}>Manage database staff accounts seamlessly.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} disabled={isSubmitting}>
          <Plus size={18} /> {showAdd ? 'Cancel' : 'Add Employee'}
        </button>
      </div>
      
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name (F/M/L)</th>
              <th>Credentials</th>
              <th>HR (Supv/Sal/DOJ)</th>
              <th>Gender & Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {showAdd && (
              <tr style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                <td><span style={{ fontSize: '12px', color: '#888' }}>DB Auto</span></td>
                <td>
                  <input type="text" placeholder="First" value={newEmp.fname} onChange={e => setNewEmp({...newEmp, fname: e.target.value})} style={{ width: '80px', marginBottom: '4px', display: 'block' }} />
                  <input type="text" placeholder="Minit" value={newEmp.minit} maxLength={1} onChange={e => setNewEmp({...newEmp, minit: e.target.value})} style={{ width: '80px', marginBottom: '4px', display: 'block' }} />
                  <input type="text" placeholder="Last" value={newEmp.lname} onChange={e => setNewEmp({...newEmp, lname: e.target.value})} style={{ width: '80px' }} />
                </td>
                <td>
                  <input type="email" placeholder="Email" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} style={{ width: '130px', marginBottom: '4px', display:'block' }} />
                  <input type="text" placeholder="Password Hash" value={newEmp.password_hash} onChange={e => setNewEmp({...newEmp, password_hash: e.target.value})} style={{ width: '130px' }} />
                </td>
                <td>
                   <input type="number" placeholder="Supv ID (opt)" value={newEmp.supervisor_id} onChange={e => setNewEmp({...newEmp, supervisor_id: e.target.value})} style={{ width: '120px', marginBottom: '4px', display: 'block' }} />
                   <input type="number" placeholder="Salary" value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: e.target.value})} style={{ width: '120px', marginBottom: '4px', display: 'block' }} />
                   <input type="date" value={newEmp.date_of_joining} onChange={e => setNewEmp({...newEmp, date_of_joining: e.target.value})} style={{ width: '120px' }} />
                </td>
                <td>
                   <select value={newEmp.gender} onChange={e => setNewEmp({...newEmp, gender: e.target.value})} style={{ width: '100px', padding: '4px', marginBottom: '4px', display: 'block' }}>
                     <option value="">Gender</option><option value="M">M</option><option value="F">F</option>
                   </select>
                   <input type="text" placeholder="Street" value={newEmp.street} onChange={e => setNewEmp({...newEmp, street: e.target.value})} style={{ width: '100px', marginBottom: '4px', display: 'block' }} />
                   <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                     <input type="text" placeholder="City" value={newEmp.city} onChange={e => setNewEmp({...newEmp, city: e.target.value})} style={{ width: '50px' }} />
                     <input type="text" placeholder="State/Stats" value={newEmp.stats} onChange={e => setNewEmp({...newEmp, stats: e.target.value})} style={{ width: '48px' }} />
                   </div>
                   <input type="text" placeholder="Zip" value={newEmp.Zip} onChange={e => setNewEmp({...newEmp, Zip: e.target.value})} style={{ width: '100px' }} />
                </td>
                <td>
                  <button className="btn btn-success" onClick={handleAdd} disabled={isSubmitting} style={{ padding: '6px 12px', fontSize: '12px' }}>{isSubmitting ? 'Saving' : 'Save Data'}</button>
                </td>
              </tr>
            )}
            
            {employees.length === 0 ? (
               <tr>
                 <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                   No employees found in DB.
                 </td>
               </tr>
            ) : employees.map(emp => {
              const isEditing = editingId === emp.employee_id;
              
              if (isEditing) {
                return (
                  <tr key={emp.employee_id} style={{ backgroundColor: 'rgba(77, 191, 160, 0.1)' }}>
                    <td style={{ fontWeight: 600 }}>EMP-{emp.employee_id}</td>
                    <td>
                      <input type="text" value={editForm.fname} placeholder="First" onChange={e => setEditForm({...editForm, fname: e.target.value})} style={{ width: '80px', marginBottom: '4px', display: 'block' }} />
                      <input type="text" value={editForm.minit || ''} placeholder="Minit" maxLength={1} onChange={e => setEditForm({...editForm, minit: e.target.value})} style={{ width: '80px', marginBottom: '4px', display: 'block' }} />
                      <input type="text" value={editForm.lname} placeholder="Last" onChange={e => setEditForm({...editForm, lname: e.target.value})} style={{ width: '80px' }} />
                    </td>
                    <td>
                      <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} style={{ width: '130px', marginBottom: '4px', display:'block' }} />
                      <input type="text" value={editForm.password_hash || ''} placeholder="Password" onChange={e => setEditForm({...editForm, password_hash: e.target.value})} style={{ width: '130px' }} />
                    </td>
                    <td>
                      <input type="number" value={editForm.supervisor_id || ''} placeholder="Supv ID" onChange={e => setEditForm({...editForm, supervisor_id: e.target.value})} style={{ width: '120px', marginBottom: '4px', display: 'block' }} />
                      <input type="number" value={editForm.salary || ''} placeholder="Salary" onChange={e => setEditForm({...editForm, salary: e.target.value})} style={{ width: '120px', marginBottom: '4px', display: 'block' }} />
                      <input type="date" value={editForm.date_of_joining || ''} onChange={e => setEditForm({...editForm, date_of_joining: e.target.value})} style={{ width: '120px' }} />
                    </td>
                    <td>
                      <select value={editForm.gender || ''} onChange={e => setEditForm({...editForm, gender: e.target.value})} style={{ width: '100px', padding: '4px', marginBottom: '4px', display: 'block' }}>
                        <option value="">Gender</option><option value="M">M</option><option value="F">F</option>
                      </select>
                      <input type="text" placeholder="Street" value={editForm.street || ''} onChange={e => setEditForm({...editForm, street: e.target.value})} style={{ width: '100px', marginBottom: '4px', display: 'block' }} />
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                        <input type="text" placeholder="City" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} style={{ width: '50px' }} />
                        <input type="text" placeholder="State" value={editForm.stats || ''} onChange={e => setEditForm({...editForm, stats: e.target.value})} style={{ width: '48px' }} />
                      </div>
                      <input type="text" placeholder="Zip" value={editForm.Zip || ''} onChange={e => setEditForm({...editForm, Zip: e.target.value})} style={{ width: '100px' }} />
                    </td>
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
                <tr key={emp.employee_id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>EMP-{emp.employee_id}</td>
                  <td style={{ fontWeight: 600 }}>{emp.fname} {emp.minit ? emp.minit + '.' : ''} {emp.lname}</td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{emp.email}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>pw: {emp.password_hash}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>Supv ID: {emp.supervisor_id || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>₹{emp.salary || '-'} | Joined: {emp.date_of_joining || '-'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>G: {emp.gender || '-'}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', maxWidth: '120px', whiteSpace: 'normal' }}>
                       {emp.address?.street ? emp.address.street + ', ' : ''}
                       {emp.address?.city ? emp.address.city + ', ' : ''}
                       {emp.address?.stats ? emp.address.stats + ' ' : ''}
                       {emp.address?.Zip || ''}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" onClick={() => handleEditClick(emp)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                      <button className="btn btn-outline" onClick={() => handleDelete(emp.employee_id)} style={{ padding: '4px 8px', fontSize: '11px', color: '#ff6b6b', borderColor: '#ff6b6b' }}>Delete</button>
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
