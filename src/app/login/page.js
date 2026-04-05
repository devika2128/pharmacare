"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (email && password) {
      if (typeof window !== 'undefined') {
        if (email === 'admin@pharmacare.com' && password === 'admin') {
          login('Admin', email, 0); // Assign ID 0 to Admin uniquely
          router.push('/');
          return;
        }

        // Try authenticating against Supabase database
        try {
          const { data, error } = await supabase
            .from('employee')
            .select('*')
            .eq('email', email)
            .eq('password_hash', password);
            
          if (data && data.length > 0) {
            const emp = data[0];
            // Admin role can be inferred or default to Pharmacist/Staff based on salary or supervisor logic
            let role = 'Staff';
            if (emp.salary && emp.salary >= 60000) role = 'Pharmacist';
            if (emp.employee_id === 1 || email.includes('admin')) role = 'Admin';
            
            login(role, email, emp.employee_id);
            router.push('/');
            return;
          }
        } catch (err) {
          console.error("DB Login error:", err);
        }

        const storedEmployees = JSON.parse(localStorage.getItem('pharmacare_employees') || '[]');
        
        const defaultEmployees = [
          { email: 'pharmacist@pharmacare.com', password: 'password123', role: 'Pharmacist', status: 'Active' },
          { email: 'staff@pharmacare.com', password: 'password123', role: 'Staff', status: 'Active' },
          { email: 'alice.staff@pharmacare.com', password: 'password123', role: 'Staff', status: 'Active' }
        ];

        const allEmployees = storedEmployees.length > 0 ? storedEmployees : defaultEmployees;

        const match = allEmployees.find(emp => emp.email === email && emp.password === password);

        if (match) {
          if (match.status && match.status !== 'Active') {
             alert("This account is currently inactive. Contact Admin.");
             return;
          }
          login(match.role, email, match.employee_id || 999);
          router.push('/');
        } else {
          alert('Invalid email or password.');
        }
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: '2rem'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '3rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)', fontSize: '32px', fontStyle: 'italic', margin: 0 }}>
            PharmaCare
          </h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Pharmacy Management System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ position: 'relative' }}>
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
               <Mail size={16} color="#888" style={{ position: 'absolute', left: '12px', top: '10px' }} />
               <input 
                 type="email" 
                 placeholder="admin@pharmacare.com" 
                 style={{ paddingLeft: '38px' }} 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 required 
               />
            </div>
          </div>
          
          <div className="form-group" style={{ position: 'relative', marginBottom: '2rem' }}>
            <label>Password</label>
            <div style={{ position: 'relative' }}>
               <Lock size={16} color="#888" style={{ position: 'absolute', left: '12px', top: '10px' }} />
               <input 
                 type="password" 
                 placeholder="••••••••" 
                 style={{ paddingLeft: '38px' }}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 required 
               />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontSize: '16px' }}
          >
            Access Dashboard <ChevronRight size={18} />
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '13px', color: '#888' }}>
          Authorized personnel only. Contact IT for access.
             <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.05)', padding: '0.5rem', borderRadius: '4px', textAlign: 'left' }}>
             <strong>Test Accounts:</strong><br/>
             admin@pharmacare.com (pw: admin)<br/>
             pharmacist@pharmacare.com (pw: password123)<br/>
             staff@pharmacare.com (pw: password123)<br/>
             alice.staff@pharmacare.com (pw: password123)<br/>
             <em>(Or use any credentials defined in Employee DB Table)</em>
          </div>
        </div>
      </div>
    </div>
  );
}
