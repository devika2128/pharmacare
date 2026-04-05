"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, ShoppingCart, Truck, Users, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import './Sidebar.css';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home, roles: ['Admin', 'Pharmacist', 'Staff'] },
  { name: 'Medicines', href: '/medicines', icon: Pill, roles: ['Admin', 'Pharmacist', 'Staff'] },
  { name: 'Sales', href: '/sales', icon: ShoppingCart, roles: ['Admin', 'Pharmacist', 'Staff'] },
  { name: 'Suppliers', href: '/suppliers', icon: Truck, roles: ['Admin'] },
  { name: 'Purchases', href: '/purchases', icon: Truck, roles: ['Admin'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['Admin', 'Pharmacist', 'Staff'] },
  { name: 'Employees', href: '/employees', icon: Activity, roles: ['Admin'] },
  { name: 'Reports', href: '/reports', icon: Activity, roles: ['Admin', 'Pharmacist'] }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>PharmaCare</h2>
      </div>
      <nav className="sidebar-nav">
        {navItems.filter(item => item.roles.includes(role || 'Staff')).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('pharmacare_auth');
              localStorage.removeItem('pharmacare_role');
              localStorage.removeItem('pharmacare_email');
              window.location.href = '/login';
            }
          }} 
          className="sidebar-link" 
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#ff6b6b' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
