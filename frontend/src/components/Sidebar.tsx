import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock, LayoutDashboard, Users, Briefcase, Building2,
  Shield, Calendar, FileSpreadsheet, BookOpen, User,
  LogOut, ChevronLeft, ChevronRight, ClipboardList,
} from 'lucide-react';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const SUPERUSER_NAV: NavItem[] = [
  { to: '/superuser/dashboard',    icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/superuser/clients',      icon: <Building2 size={18} />,       label: 'Clients' },
  { to: '/superuser/projects',     icon: <Briefcase size={18} />,       label: 'Projects' },
  { to: '/superuser/employees',    icon: <Users size={18} />,           label: 'Employees' },
  { to: '/superuser/roles',        icon: <Shield size={18} />,          label: 'Role Management' },
  { to: '/superuser/timesheets',   icon: <Calendar size={18} />,        label: 'All Timesheets' },
  { to: '/superuser/export',       icon: <FileSpreadsheet size={18} />, label: 'Export' },
  { to: '/superuser/audit',        icon: <BookOpen size={18} />,        label: 'Audit Log' },
  { to: '/profile',                icon: <User size={18} />,            label: 'My Profile' },
];

const TEAMLEAD_NAV: NavItem[] = [
  { to: '/teamlead/dashboard',     icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/teamlead/employees',     icon: <Users size={18} />,           label: 'Employees' },
  { to: '/teamlead/projects',      icon: <Briefcase size={18} />,       label: 'Projects' },
  { to: '/teamlead/timesheets',    icon: <Calendar size={18} />,        label: 'Timesheets' },
  { to: '/teamlead/export',        icon: <FileSpreadsheet size={18} />, label: 'Export' },
  { to: '/teamlead/my-timesheet',  icon: <ClipboardList size={18} />,   label: 'My Timesheet' },
  { to: '/profile',                icon: <User size={18} />,            label: 'My Profile' },
];

const EMPLOYEE_NAV: NavItem[] = [
  { to: '/employee/dashboard',     icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/employee/my-timesheet',  icon: <ClipboardList size={18} />,   label: 'My Timesheet' },
  { to: '/profile',                icon: <User size={18} />,            label: 'My Profile' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onCloseMobile }) => {
  const { user, logout, setActiveClient } = useAuth();
  const navigate = useNavigate();

  const navItems: NavItem[] = user?.is_superuser
    ? SUPERUSER_NAV
    : user?.is_team_lead
    ? TEAMLEAD_NAV
    : EMPLOYEE_NAV;

  const roleLabel = user?.is_superuser ? 'Superuser' : user?.is_team_lead ? 'Team Lead' : 'Employee';

  const initials = user
    ? ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? user.username[0])).toUpperCase()
    : '?';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}
      <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ paddingBottom: user?.is_team_lead && user.clients && user.clients.length > 1 && !collapsed ? '0.5rem' : '1.5rem' }}>
        <div className="sidebar-logo-icon">
          <Clock size={20} color="white" />
        </div>
        {!collapsed && (
          <div>
            <div className="sidebar-logo-text">TimeFlow</div>
            <div className="sidebar-logo-sub">Timesheet System</div>
          </div>
        )}
      </div>

      {/* Client Switcher for Team Lead with Multiple Clients */}
      {!collapsed && user?.is_team_lead && user.clients && user.clients.length > 1 && (
        <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '0.35rem', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE CLIENT</label>
          <select 
            value={user.client_id ?? ''} 
            onChange={(e) => setActiveClient(Number(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.45rem 0.6rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {user.clients.map((c) => (
              <option key={c.client_id} value={c.client_id} style={{ color: '#333' }}>
                {c.client_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' active' : ''}`
            }
            title={collapsed ? item.label : undefined}
            onClick={onCloseMobile}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-item-text">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Collapse toggle */}
        <button className="sidebar-collapse-btn" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Logout */}
        <button
          className="sidebar-item"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          style={{ color: 'rgba(239,68,68,0.8)' }}
        >
          <span className="sidebar-item-icon"><LogOut size={18} /></span>
          {!collapsed && <span className="sidebar-item-text">Logout</span>}
        </button>

        {/* User Info */}
        {!collapsed && (
          <div className="sidebar-user" style={{ marginTop: '0.5rem' }}>
            <div className="sidebar-user-avatar">{initials}</div>
            <div style={{ overflow: 'hidden' }}>
              <div className="sidebar-user-name truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username}
              </div>
              <div className="sidebar-user-role">{roleLabel}</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="sidebar-user" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
            <div className="sidebar-user-avatar" title={user?.username}>{initials}</div>
          </div>
        )}
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
