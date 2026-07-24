import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SocketProvider } from '@/contexts/SocketContext';

// Layouts
import AdminLayout from '@/layouts/AdminLayout';
import MemberLayout from '@/layouts/MemberLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Admin Pages
import DashboardPage from '@/pages/admin/DashboardPage';
import InventoryPage from '@/pages/admin/InventoryPage';
import TransactionsPage from '@/pages/admin/TransactionsPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';
import UsersPage from '@/pages/admin/UsersPage';
import AIAssistantPage from '@/pages/admin/AIAssistantPage';
import EquipmentPlannerPage from '@/pages/admin/EquipmentPlannerPage';
import ReportsPage from '@/pages/admin/ReportsPage';

// Member Pages
import MemberDashboard from '@/pages/member/MemberDashboard';
import FindItemPage from '@/pages/member/FindItemPage';
import MyBorrowsPage from '@/pages/member/MyBorrowsPage';

/** Protected route guard — strictly enforces login & role separation */
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'member' }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict role separation — cross-role access is blocked and redirected to proper view
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/member/scan'} replace />;
  }

  return <>{children}</>;
}

/** Root redirect based on role */
function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/member/scan'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Admin routes — strictly requiredRole="admin" */}
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="planner" element={<EquipmentPlannerPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Member routes — strictly requiredRole="member" */}
      <Route path="/member" element={
        <ProtectedRoute requiredRole="member">
          <MemberLayout />
        </ProtectedRoute>
      }>
        <Route index element={<MemberDashboard />} />
        <Route path="scan" element={<FindItemPage />} />
        <Route path="find" element={<FindItemPage />} />
        <Route path="borrows" element={<MyBorrowsPage />} />
        <Route path="profile" element={<MemberDashboard />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">404</h1>
            <p className="text-slate-500 text-xs mt-1">Page not found</p>
            <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700">
              Return Home
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontSize: '13px',
                },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
