"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('q') || '';
      setQuery(q);

      const storedMeds = JSON.parse(localStorage.getItem('pharmacare_medicines') || '[]');
      const storedCusts = JSON.parse(localStorage.getItem('pharmacare_customers') || '[]');

      if (q) {
         setMedicines(storedMeds.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || (m.batch && m.batch.toLowerCase().includes(q.toLowerCase()))));
         setCustomers(storedCusts.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone && c.phone.includes(q))));
      }
    }
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1>Global Search Results</h1>
        <p style={{ color: '#666' }}>Showing results for <strong>"{query}"</strong> across all directories.</p>
      </div>

      <div className="grid gap-6">
        {/* Medicine Results */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
             <h3 style={{ margin: 0 }}>Medicines ({medicines.length})</h3>
             <Link href="/medicines" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }}>View Ledger</Link>
          </div>
          
          {medicines.length === 0 ? (
            <div style={{ color: '#888', padding: '1rem 0' }}>No medicines matched your query.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Stock</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map(med => (
                  <tr key={med.id}>
                    <td style={{ fontWeight: 'bold' }}>{med.name}</td>
                    <td>{med.category}</td>
                    <td>
                      <span className={`pill ${med.quantity > 0 ? 'pill-success' : 'pill-danger'}`}>
                         {med.quantity} in stock
                      </span>
                    </td>
                    <td>₹{med.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Customer Results */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
             <h3 style={{ margin: 0 }}>Customers ({customers.length})</h3>
             <Link href="/customers" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }}>View Directory</Link>
          </div>
          
          {customers.length === 0 ? (
            <div style={{ color: '#888', padding: '1rem 0' }}>No customers matched your query.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(cust => (
                  <tr key={cust.id}>
                    <td style={{ fontWeight: 'bold' }}>{cust.name}</td>
                    <td>{cust.phone}</td>
                    <td>{cust.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
