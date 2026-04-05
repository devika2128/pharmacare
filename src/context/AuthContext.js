"use client";

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  user: null,
  role: null,
  isLoaded: false,
  login: () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Hydrate auth from localStorage on boot
    const isAuth = localStorage.getItem('pharmacare_auth') === 'true';
    const savedRole = localStorage.getItem('pharmacare_role');
    
    if (isAuth && savedRole) {
      setUser({ 
         email: localStorage.getItem('pharmacare_email') || 'User',
         id: localStorage.getItem('pharmacare_user_id') 
      });
      setRole(savedRole);
    }
    setIsLoaded(true);
  }, []);

  const login = (roleType, email, userId) => {
    localStorage.setItem('pharmacare_auth', 'true');
    localStorage.setItem('pharmacare_role', roleType);
    localStorage.setItem('pharmacare_email', email);
    if (userId !== undefined) localStorage.setItem('pharmacare_user_id', userId);
    setRole(roleType);
    setUser({ email, id: userId });
  };

  const logout = () => {
    localStorage.removeItem('pharmacare_auth');
    localStorage.removeItem('pharmacare_role');
    localStorage.removeItem('pharmacare_email');
    localStorage.removeItem('pharmacare_user_id');
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoaded, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
