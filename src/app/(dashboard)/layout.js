import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import AuthGuard from '@/components/AuthGuard';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from 'react-hot-toast';

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider>
      <AuthGuard>
        <div className="layout-container">
          <Sidebar />
          <div className="main-content">
            <TopNav />
            <main className="page-container">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="bottom-right" />
      </AuthGuard>
    </ThemeProvider>
  );
}
