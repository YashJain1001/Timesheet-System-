import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const ROUTE_TITLES: Record<string, string> = {
  '/superuser/dashboard':  'Dashboard',
  '/superuser/clients':    'Client Management',
  '/superuser/projects':   'Project Management',
  '/superuser/employees':  'Employee Management',
  '/superuser/roles':      'Role Management',
  '/superuser/timesheets': 'All Timesheets',
  '/superuser/export':     'Export',
  '/superuser/audit':      'Audit Log',
  '/teamlead/dashboard':   'Dashboard',
  '/teamlead/employees':   'Employees',
  '/teamlead/projects':    'Projects',
  '/teamlead/timesheets':  'Timesheets',
  '/teamlead/export':      'Export',
  '/teamlead/my-timesheet':'My Timesheet',
  '/employee/dashboard':   'Dashboard',
  '/employee/my-timesheet':'My Timesheet',
  '/profile':              'My Profile',
};

interface NavbarProps {
  onMenuToggle?: () => void;
}

const Topbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  const pageTitle = ROUTE_TITLES[pathname] ?? 'TimeFlow';

  const initials = user
    ? ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? user.username[0])).toUpperCase()
    : '?';

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user?.username ?? '';

  return (
    <header className="app-topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button 
          className="btn btn-ghost btn-icon sidebar-toggle-mobile" 
          onClick={onMenuToggle}
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          <Menu size={18} />
        </button>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {pageTitle}
        </h2>
      </div>

      <div className="topbar-right">
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-icon"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="topbar-avatar" title={displayName}>{initials}</div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user.is_superuser ? 'Superuser' : user.is_team_lead ? 'Team Lead' : 'Employee'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
