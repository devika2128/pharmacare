import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'PharmaCare - Pharmacy Management System',
  description: 'Premium Pharmacy Management System built for S4 DBMS Project',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
