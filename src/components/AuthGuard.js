"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (!user) {
        router.push('/login');
      } else {
        // Enforce role-based strict locking
        const isRestrictedRoute = pathname.includes('/employees') || pathname.includes('/suppliers');
        if (isRestrictedRoute && role !== 'Admin') {
           router.push('/');
        }
      }
    }
  }, [isLoaded, user, role, pathname, router]);

  if (!isLoaded || !user) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)' }}>Loading Profile Securely...</div>;
  }

  // Also enforce block on render just in case
  const isRestrictedRoute = pathname.includes('/employees') || pathname.includes('/suppliers');
  if (isRestrictedRoute && role !== 'Admin') {
     return null;
  }

  return <>{children}</>;
}
