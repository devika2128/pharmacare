"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, CheckCircle, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/utils/supabase';

export default function SalesPage() {
  const [medicines, setMedicines] = useState([]);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState([]);
  const [isDone, setIsDone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState(null); // Will hold DB customer object or null
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  const [prescriptionDetails, setPrescriptionDetails] = useState({
     doctor_name: '',
     place: '',
     prescription_number: '',
     prescription_date: new Date().toISOString().split('T')[0]
  });
  
  const [transactionId, setTransactionId] = useState('');
  const [completedCustomerId, setCompletedCustomerId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const searchInputRef = useRef(null);

  useEffect(() => {
    async function loadData() {
       const [medsRes, custsRes, empsRes] = await Promise.all([
          supabase.from('medicine').select('*').order('name'),
          supabase.from('customer').select('*').order('name'),
          supabase.from('employee').select('*')
       ]);
       
       if (medsRes.data) setMedicines(medsRes.data);
       if (custsRes.data) setExistingCustomers(custsRes.data);
       if (empsRes.data) {
          setEmployees(empsRes.data);
       }
    }
    loadData();
  }, []);
  
  // Auto focus if active
  useEffect(() => {
     if (step === 1 && searchInputRef.current) {
        searchInputRef.current.focus();
     }
  }, [step]);

  const filteredMedicines = medicines.filter(med => 
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) || (med.batch_number && med.batch_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  
  const addToCart = (med) => {
    const existing = cart.find(item => item.medicine.medicine_id === med.medicine_id);
    if (existing) {
       toast.error("Already in basket, update quantity in Details step.");
    } else {
       if (med.available_quantity <= 0) {
         toast.error("Out of Stock!");
         return;
       }
       setCart([...cart, { medicine: med, qty: 1 }]);
       toast.success("Added to cart!");
    }
  };

  const handleSearchKeyDown = (e) => {
     if (e.key === 'Enter') {
        if (filteredMedicines.length === 1) {
           addToCart(filteredMedicines[0]);
           toast.success("Item scanned successfully!");
        } else if (filteredMedicines.length === 0) {
           toast.error("Item not found!");
        }
     }
  };

  const handleNext = () => setStep(prev => prev + 1);
  
  const handleConfirm = async () => {
    if (cart.length === 0 || !selectedEmployeeId) {
      toast.error("Missing Medicine or Employee Selection");
      return;
    }
    
    const invalid = cart.find(c => c.qty > c.medicine.available_quantity);
    if (invalid) {
       toast.error(invalid.medicine.name + " maximum quantity exceeded!");
       return;
    }
  
    
    setIsSubmitting(true);
    let finalCustId = null;

    try {
      // 1. Resolve Customer
      if (selectedCustomer) {
         finalCustId = selectedCustomer.customer_id;
      } else {
         const finalCustomerName = customerName.trim() || 'Walk-in Customer';
         // Insert new customer
         const { data: custData, error: custErr } = await supabase.from('customer').insert([{
            name: finalCustomerName,
            phone_number: customerPhone || null,
            address: customerAddress || null
         }]).select();
         
         if (custErr) throw custErr;
         finalCustId = custData[0].customer_id;
         setExistingCustomers([...existingCustomers, custData[0]]);
      }

      // 2. Create SALES record
      const totalAmount = parseFloat(cart.reduce((s, i) => s + (i.medicine.price * i.qty), 0).toFixed(2));
      const { data: saleData, error: saleErr } = await supabase.from('sales').insert([{
         sale_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
         total_amount: totalAmount,
         customer_id: finalCustId,
         employee_id: parseInt(selectedEmployeeId)
      }]).select();

      if (saleErr) throw saleErr;
      const newSaleId = saleData[0].sale_id;

      // 3. Create INCLUDES record
      const includesData = cart.map(item => ({
        sale_id: newSaleId,
        medicine_id: item.medicine.medicine_id,
        quantity: parseInt(item.qty)
      }));
      const { error: incErr } = await supabase.from('includes').insert(includesData);
      
      if (incErr) throw incErr;

      // 4. Update MEDICINE inventory (Local UI only)
      // We intentionally skip supabase.from('medicine').update() because the Postgres Database Trigger (after_sale_insert) controls it autonomously!
      
      // Medicine update locally
      setMedicines(medicines.map(m => {
         const sold = cart.find(c => c.medicine.medicine_id === m.medicine_id);
         if (sold) return { ...m, available_quantity: m.available_quantity - sold.qty };
         return m;
      }));

      // 5. Store Prescription Details if it requires Rx
      const requiresRx = cart.some(c => c.medicine.requires_prescription);
      if (requiresRx) {
         const { error: rxErr } = await supabase.from('prescription').insert([{
            doctor_name: prescriptionDetails.doctor_name,
            place: prescriptionDetails.place,
            prescription_number: prescriptionDetails.prescription_number,
            prescription_date: prescriptionDetails.prescription_date,
            sale_id: newSaleId
         }]);
         if (rxErr) throw rxErr;
      }

      setTransactionId(newSaleId);
      setCompletedCustomerId(finalCustId);
      
      toast.success("Sale Confirmed and Saved nicely to DB!");
      setIsDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm sale: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isDone) {
    const finalCustName = selectedCustomer ? selectedCustomer.name : (customerName || 'Walk-in Customer');
    return (
      <div>
        <style>{`
          .receipt-print { display: none; }
          @media print {
             body * { visibility: hidden; }
             .receipt-print {
                display: block !important;
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                max-width: 350px;
                background: white;
                color: black;
                font-family: 'Courier New', Courier, monospace;
                padding: 15px;
                margin: 0 auto;
             }
             .receipt-print * { visibility: visible; }
             .hide-print { display: none !important; }
          }
        `}</style>

        <div className="card text-center mb-6 flex flex-col items-center hide-print" style={{ padding: '3rem' }}>
          <CheckCircle size={64} color="var(--color-success)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '28px', marginBottom: '0.5rem' }}>Sale Completed Successfully!</h2>
          <p style={{ color: '#888', marginBottom: '0.5rem' }}>DB Sale ID: #{transactionId}</p>
          <p style={{ color: '#888', marginBottom: '2rem' }}>
             DB Customer ID: CUST-{completedCustomerId}
          </p>
          <div className="flex justify-center gap-4">
             <button className="btn btn-primary flex items-center gap-2" onClick={() => window.print()}>
                <Printer size={18} /> Print Customer Bill
             </button>
          </div>
          <div style={{ marginTop: '3rem', borderTop: '1px solid #ddd', paddingTop: '2rem', width: '100%' }}>
             <button className="btn btn-outline" style={{ borderStyle: 'dashed' }} onClick={() => { 
                setIsDone(false); setStep(1); setCart([]); 
                setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); 
                setSelectedCustomer(null); setSearchQuery(''); 
                setPrescriptionDetails({ doctor_name:'', place:'', prescription_number:'', prescription_date: new Date().toISOString().split('T')[0] });
             }}>
                Start Next Sale
             </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Generation */}
        <div className="receipt-print">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
               <h2 style={{ margin: 0, fontSize: '22px' }}>PHARMACARE PLUS</h2>
               <p style={{ margin: '4px 0', fontSize: '12px' }}>123 Health Ave, Medical City</p>
               <p style={{ margin: '4px 0', fontSize: '12px' }}>Tel: +91 98765 43210</p>
            </div>
            
            <div style={{ borderBottom: '1px dashed #000', marginBottom: '8px', paddingBottom: '8px', fontSize: '14px' }}>
               <div><strong>Receipt No:</strong> SALE-{transactionId}</div>
               <div><strong>Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
               <div><strong>Customer:</strong> {finalCustName}</div>
               <div><strong>Served By:</strong> EMP-{selectedEmployeeId}</div>
            </div>

            <table style={{ width: '100%', fontSize: '14px', marginBottom: '16px' }}>
               <thead>
                  <tr style={{ borderBottom: '1px dashed #000' }}>
                     <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
                     <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Qty</th>
                     <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
                  </tr>
               </thead>
               <tbody>
                   {cart.map((item, idx) => (
                   <tr key={idx}>
                     <td style={{ paddingTop: '8px' }}>
                        {item.medicine.name} <br/>
                        <span style={{ fontSize: '11px' }}>@ ₹{parseFloat(item.medicine.price || 0).toFixed(2)}</span>
                     </td>
                     <td style={{ textAlign: 'right', paddingTop: '8px' }}>{item.qty}</td>
                     <td style={{ textAlign: 'right', paddingTop: '8px' }}>₹{(item.medicine.price * item.qty).toFixed(2)}</td>
                   </tr>
                   ))}
               </tbody>
            </table>

            <div style={{ borderTop: '1px dashed #000', paddingTop: '8px', marginBottom: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
                  <span>NET TOTAL:</span>
                  <span>₹{cart.reduce((s, i) => s + i.medicine.price * i.qty, 0).toFixed(2)}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                  <span>Payment Mode:</span>
                  <span>Cash/Card</span>
               </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '30px' }}>
               <p style={{ margin: '2px 0' }}>*** THANK YOU FOR YOUR VISIT ***</p>
               <p style={{ margin: '2px 0' }}>Wishing you good health!</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1>New Point of Sale</h1>
        <p style={{ color: '#666' }}>Process a customer transaction directly to Database.</p>
      </div>

      <div className="flex gap-4 mb-6">
        {[1, 2, 3].map(s => {
          let label = "Select Med";
          if (s===2) label = "Details";
          if (s===3) label = "Summary";
          
          return (
            <div key={s} style={{ 
              flex: 1, 
              borderBottom: step >= s ? '4px solid var(--color-success)' : '4px solid #E0DCD6', 
              paddingBottom: '0.5rem',
              color: step >= s ? 'var(--color-primary)' : '#888',
              fontWeight: step >= s ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ 
                background: step >= s ? 'var(--color-success)' : '#E0DCD6', 
                color: step >= s ? 'white' : '#666', 
                width: '24px', 
                height: '24px', 
                borderRadius: '50%', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>{s}</span>
              {label}
            </div>
          )
        })}
      </div>

      <div className="card">
        {step === 1 && (
          <div>
            <h3 className="mb-4">Select Medicine via Search or Barcode</h3>
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
               <Search size={16} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
               <input 
                 ref={searchInputRef}
                 type="text" 
                 placeholder="Search DB by name or scan barcode batch..." 
                 style={{ paddingLeft: '38px', paddingRight: '16px', height: '48px', fontSize: '16px' }} 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={handleSearchKeyDown}
               />
               <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#888', background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>Scanner Ready</span>
            </div>
            
            <div className="grid gap-2 mb-4">
              {filteredMedicines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888', border: '1px dashed #ddd', borderRadius: '8px' }}>No medicines found matching "{searchQuery}"</div>
              ) : filteredMedicines.map(med => (
                <div 
                  key={med.medicine_id} 
                  style={{ 
                    border: cart.some(c => c.medicine.medicine_id === med.medicine_id) ? '2px solid var(--color-success)' : '1px solid #ddd',
                    background: cart.some(c => c.medicine.medicine_id === med.medicine_id) ? 'rgba(77, 191, 160, 0.05)' : 'transparent',
                    padding: '1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => addToCart(med)}
                >
                  <div className="flex items-center gap-4">
                    <div style={{ width: '40px', height: '40px', background: '#F5F0E8', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                       💊
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: med.available_quantity === 0 ? '#888' : 'inherit', display: 'flex', alignItems: 'center' }}>
                         {med.name}
                         {med.requires_prescription && <span className="pill" style={{ background: '#ffcccb', color: '#cc0000', marginLeft: '8px', fontSize: '10px', padding: '2px 6px' }}>Rx Required</span>}
                         {med.available_quantity <= 0 && <span className="pill pill-danger" style={{ marginLeft: '8px' }}>Out of Stock</span>}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                         MED-{med.medicine_id} | Batch: {med.batch_number} • In stock: {med.available_quantity}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', color: 'var(--color-primary)' }}>
                    ₹{parseFloat(med.price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4" style={{ borderTop: '1px solid #ddd' }}>
              <button className="btn btn-primary" disabled={cart.length === 0} onClick={handleNext}>Continue to Details <ChevronRight size={16} /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Quantity, Customer & Staff Setup</h3>

            <div className="grid grid-cols-2 gap-6 mt-4">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Cart Items <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                {cart.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '8px' }}>
                     <strong style={{minWidth: '200px'}}>{item.medicine.name} (Max: {item.medicine.available_quantity})</strong>
                     <input type="number" min="1" max={item.medicine.available_quantity} value={item.qty} 
                       onChange={e => {
                         const newCart = [...cart];
                         newCart[idx].qty = parseInt(e.target.value) || 1;
                         setCart(newCart);
                       }}
                       style={{ width: '100px' }}
                     />
                     <button className="btn btn-outline" onClick={() => setCart(cart.filter((_, i) => i !== idx))} style={{padding: '4px', fontSize: '11px', color: 'red'}}>Remove</button>
                  </div>
                ))}
              </div>
              
              <div className="form-group" style={{ gridColumn: 'span 2', padding: '1rem', border: '1px dashed #ddd', borderRadius: '8px' }}>
                 <label>Handling Employee <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                 <select value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)} style={{ padding: '8px' }}>
                    <option value="">Select Employee...</option>
                    {employees.map(emp => (
                       <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.fname} {emp.lname} (EMP-{emp.employee_id})
                       </option>
                    ))}
                 </select>
                 <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Employee assignment is required for DB records.</div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>Customer Selection</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                   <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" checked={!selectedCustomer} onChange={() => { setSelectedCustomer(null); setCustomerName(''); setCustomerPhone(''); setCustomerAddress(''); }} /> 
                      Create New Customer
                   </label>
                </div>

                {!selectedCustomer ? (
                   <div className="grid grid-cols-2 gap-4">
                      <div className="form-group">
                         <label>Customer Name</label>
                         <input type="text" placeholder="Enter new name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </div>
                      <div className="form-group">
                         <label>Phone Number</label>
                         <input type="text" placeholder="Optional" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                         <label>Address</label>
                         <input type="text" placeholder="Optional" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                         <label>Or select existing:</label>
                         <select onChange={(e) => {
                            if(e.target.value) {
                               const match = existingCustomers.find(c => c.customer_id.toString() === e.target.value);
                               if(match) setSelectedCustomer(match);
                            }
                         }} style={{ padding: '8px' }}>
                            <option value="">-- Choose Existing --</option>
                            {existingCustomers.map(c => (
                               <option key={c.customer_id} value={c.customer_id}>{c.name} - {c.phone_number}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                ) : (
                   <div style={{ padding: '1rem', background: 'rgba(77, 191, 160, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                         <strong>{selectedCustomer.name}</strong> <span style={{ color: '#666', fontSize: '13px' }}>(CUST-{selectedCustomer.customer_id})</span><br/>
                         <span style={{ fontSize: '13px' }}>{selectedCustomer.phone_number || 'No phone'} | {selectedCustomer.address || 'No address'}</span>
                      </div>
                      <button className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }} onClick={() => setSelectedCustomer(null)}>Clear Selection</button>
                   </div>
                )}
              </div>

              {cart.some(c => c.medicine.requires_prescription) && (
                 <div style={{ marginTop: '1.5rem', borderTop: '1px solid #ddd', paddingTop: '1.5rem' }}>
                    <h3 style={{ color: '#c53030', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span className="pill" style={{ background: '#ffcccb', color: '#cc0000', padding: '2px 6px', fontSize: '11px' }}>Rx Required</span>
                       Attach Prescription Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4" style={{ background: '#fff5f5', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fed7d7' }}>
                       <div className="form-group">
                          <label style={{ color: '#742a2a' }}>Doctor Name *</label>
                          <input type="text" placeholder="Dr. John Doe" value={prescriptionDetails.doctor_name} onChange={e => setPrescriptionDetails({...prescriptionDetails, doctor_name: e.target.value})} style={{ borderColor: '#fc8181' }} />
                       </div>
                       <div className="form-group">
                          <label style={{ color: '#742a2a' }}>Prescription Date *</label>
                          <input type="date" value={prescriptionDetails.prescription_date} onChange={e => setPrescriptionDetails({...prescriptionDetails, prescription_date: e.target.value})} style={{ borderColor: '#fc8181' }} />
                       </div>
                       <div className="form-group">
                          <label style={{ color: '#742a2a' }}>Place (Optional)</label>
                          <input type="text" placeholder="Clinic or Hospital Location" value={prescriptionDetails.place} onChange={e => setPrescriptionDetails({...prescriptionDetails, place: e.target.value})} />
                       </div>
                       <div className="form-group">
                          <label style={{ color: '#742a2a' }}>Rx Number (Optional)</label>
                          <input type="text" placeholder="Registration/Rx ID" value={prescriptionDetails.prescription_number} onChange={e => setPrescriptionDetails({...prescriptionDetails, prescription_number: e.target.value})} />
                       </div>
                    </div>
                 </div>
              )}
            </div>
            
            <div className="flex justify-between mt-8 pt-4" style={{ borderTop: '1px solid #ddd' }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => {
                if (cart.length === 0) { toast.error("Invalid Quantity!"); return; }
                if (cart.some(c => c.qty > c.medicine.available_quantity)) { toast.error("Insufficient Stock!"); return; }
                if (!selectedEmployeeId) { toast.error("Select an Employee!"); return; }
                
                if (cart.some(c => c.medicine.requires_prescription)) {
                  if (!prescriptionDetails.doctor_name || !prescriptionDetails.prescription_date) {
                    toast.error("Doctor Name and Date are required for Prescription Medicines!");
                    return;
                  }
                }
                
                setStep(3);
              }}>Proceed to Summary <ChevronRight size={16} /></button>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div>
            <h3>Final POS Summary</h3>
            <div style={{ background: 'var(--color-surface)', border: '1px solid #ddd', borderRadius: '12px', padding: '2rem', marginTop: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
               {cart.map((item, idx) => (
                 <div key={idx} className="flex justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #ddd' }}>
                   <div>
                     <strong style={{ fontSize: '18px' }}>{item.medicine.name}</strong> <br/>
                     <span style={{ color: '#888', fontSize: '14px' }}>Unit Price: ₹{parseFloat(item.medicine.price).toFixed(2)} × {item.qty} units</span>
                   </div>
                   <div style={{ fontWeight: 'bold', fontSize: '20px', color: 'var(--color-primary)' }}>₹{(item.medicine.price * item.qty).toFixed(2)}</div>
                 </div>
               ))}
               
               <div className="flex justify-between mb-2">
                 <span style={{ color: '#666' }}>Subtotal</span>
                 <span>₹{cart.reduce((s, i) => s + i.medicine.price * i.qty, 0).toFixed(2)}</span>
               </div>
               <div className="flex justify-between mb-4 pb-4" style={{ borderBottom: '1px solid #ddd' }}>
                 <span style={{ color: '#666' }}>Customer Type</span>
                 <span>{selectedCustomer ? 'Existing (CUST-' + selectedCustomer.customer_id + ')' : 'New Customer'}</span>
               </div>
               <div className="flex justify-between pt-2 mt-2" style={{ fontSize: '24px', fontWeight: 'bold' }}>
                 <span>Net Payable Amount</span>
                 <span style={{ color: 'var(--color-success)' }}>₹{cart.reduce((s, i) => s + i.medicine.price * i.qty, 0).toFixed(2)}</span>
               </div>

               {cart.some(c => c.medicine.requires_prescription) && (
                  <div style={{ marginTop: '1.5rem', background: '#fff5f5', border: '1px solid #fed7d7', padding: '1rem', borderRadius: '8px' }}>
                     <strong style={{ color: '#c53030', display: 'block', marginBottom: '8px' }}>Rx Prescription Attached</strong>
                     <div style={{ fontSize: '13px', color: '#742a2a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><strong>Doctor:</strong> {prescriptionDetails.doctor_name}</div>
                        <div><strong>Date:</strong> {prescriptionDetails.prescription_date}</div>
                        {prescriptionDetails.place && <div><strong>Place:</strong> {prescriptionDetails.place}</div>}
                        {prescriptionDetails.prescription_number && <div><strong>Rx No:</strong> {prescriptionDetails.prescription_number}</div>}
                     </div>
                  </div>
               )}
            </div>
            
            <div className="flex justify-between mt-8 pt-4" style={{ borderTop: '1px solid #ddd' }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}>Back to Edits</button>
              <button className="btn btn-success" disabled={isSubmitting} style={{ backgroundColor: 'var(--color-success)', color: 'white', padding: '0.75rem 2rem', fontSize: '16px' }} onClick={handleConfirm}>
                 {isSubmitting ? 'Persisting to DB...' : 'Complete Transaction'} <CheckCircle size={18} style={{ marginLeft: '8px' }} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
