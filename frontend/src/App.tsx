import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

// Shared
import Profile from './pages/shared/Profile';

// Superuser
import SuperuserDashboard from './pages/superuser/Dashboard';
import Clients from './pages/superuser/Clients';
import SuperuserProjects from './pages/superuser/Projects';
import SuperuserEmployees from './pages/superuser/Employees';
import RoleManagement from './pages/superuser/RoleManagement';
import AllTimesheets from './pages/superuser/AllTimesheets';
import SuperuserExport from './pages/superuser/Export';
import AuditLog from './pages/superuser/AuditLog';

// Team Lead
import TeamLeadDashboard from './pages/teamlead/Dashboard';
import TeamLeadEmployees from './pages/teamlead/Employees';
import TeamLeadProjects from './pages/teamlead/Projects';
import TeamLeadTimesheets from './pages/teamlead/Timesheets';
import TeamLeadExport from './pages/teamlead/Export';
import TeamLeadMyTimesheet from './pages/teamlead/MyTimesheet';

// Employee
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeMyTimesheet from './pages/EmployeeTimesheet';

import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// ============================================================
// App Layout (Sidebar + Topbar + Page Content)
// ============================================================
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(c => !c)} 
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main className={`app-main${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar onMenuToggle={() => setMobileOpen(o => !o)} />
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
};

// ============================================================
// Loading screen
// ============================================================
const LoadingScreen: React.FC = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
    <div style={{ textAlign: 'center' }}>
      <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
    </div>
  </div>
);

// ============================================================
// Protected Route
// ============================================================
interface ProtectedProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
  requireTeamLead?: boolean;
}

const ProtectedRoute: React.FC<ProtectedProps> = ({ children, requireSuperuser, requireTeamLead }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (requireSuperuser && !user.is_superuser) return <Navigate to="/" replace />;
  if (requireTeamLead && !user.is_team_lead && !user.is_superuser) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ============================================================
// Root redirect based on role
// ============================================================
const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_superuser) return <Navigate to="/superuser/dashboard" replace />;
  if (user.is_team_lead) return <Navigate to="/teamlead/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
};

// ============================================================
// Main App
// ============================================================
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Root redirect */}
                <Route path="/" element={<RootRedirect />} />

                {/* ── Superuser Routes ── */}
                <Route path="/superuser/dashboard" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><SuperuserDashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/clients" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><Clients /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/projects" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><SuperuserProjects /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/employees" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><SuperuserEmployees /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/roles" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><RoleManagement /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/timesheets" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><AllTimesheets /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/export" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><SuperuserExport /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/superuser/audit" element={
                  <ProtectedRoute requireSuperuser>
                    <AppLayout><AuditLog /></AppLayout>
                  </ProtectedRoute>
                } />

                {/* ── Team Lead Routes ── */}
                <Route path="/teamlead/dashboard" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadDashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/teamlead/employees" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadEmployees /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/teamlead/projects" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadProjects /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/teamlead/timesheets" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadTimesheets /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/teamlead/export" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadExport /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/teamlead/my-timesheet" element={
                  <ProtectedRoute requireTeamLead>
                    <AppLayout><TeamLeadMyTimesheet /></AppLayout>
                  </ProtectedRoute>
                } />

                {/* ── Employee Routes ── */}
                <Route path="/employee/dashboard" element={
                  <ProtectedRoute>
                    <AppLayout><EmployeeDashboard /></AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/employee/my-timesheet" element={
                  <ProtectedRoute>
                    <AppLayout><EmployeeMyTimesheet /></AppLayout>
                  </ProtectedRoute>
                } />

                {/* ── Shared Routes ── */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <AppLayout><Profile /></AppLayout>
                  </ProtectedRoute>
                } />

                {/* Legacy redirect */}
                <Route path="/my-timesheet" element={<Navigate to="/employee/my-timesheet" replace />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
