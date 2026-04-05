"use client";

import Link from 'next/link';
import { Bell, Search, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import './TopNav.css';

export default function TopNav() {
  const { role, logout } = useAuth();
  const displayRole = role || 'Staff';

  return (
    <header className="topnav">
      <div className="topnav-search" style={{ position: 'relative' }}>
        <Search size={18} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}/>
        <input 
          type="text" 
          placeholder="Global search..." 
          style={{ paddingLeft: '38px', borderRadius: '8px', border: '1px solid padding-box', width: '300px' }}
          onKeyDown={(e) => {
             if (e.key === 'Enter' && e.target.value.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(e.target.value.trim())}`;
             }
          }}
        />
      </div>
      <div className="topnav-actions">
        <button className="icon-btn" onClick={() => alert("No new notifications at this time.")}>
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        <Link href="/sales" className="btn btn-danger">
          + New Sale
        </Link>
        <div className="user-profile">
          <div className="avatar">{displayRole.charAt(0)}</div>
          <span>{displayRole}</span>
          <button onClick={logout} title="Sign Out" className="icon-btn" style={{ marginLeft: '10px' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

