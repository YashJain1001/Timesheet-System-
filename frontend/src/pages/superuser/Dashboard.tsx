import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { getClients } from '../../services/clients';
import { getEntries } from '../../services/timesheets';
import { Clock, Users, Coffee, Palmtree, ChevronDown } from 'lucide-react';

const SuperuserDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
  });

  const effectiveClientId = selectedClientId !== '' ? selectedClientId : clients[0]?.id;

  const { data: monthEntries = [] } = useQuery({
    queryKey: ['entries', effectiveClientId, currentMonth, currentYear],
    queryFn: () => getEntries({ client: effectiveClientId as number, month: currentMonth, year: currentYear }),
    enabled: !!effectiveClientId,
  });

  const { data: todayEntries = [], isLoading: loadingToday } = useQuery({
    queryKey: ['entries-today', effectiveClientId, todayStr],
    queryFn: () => getEntries({ client: effectiveClientId as number }),
    select: (data) => data.filter(e => e.date === todayStr),
    enabled: !!effectiveClientId,
  });

  const totalHours = monthEntries.reduce((s, e) => s + Number(e.total_hours || 0), 0);
  const presentDays = monthEntries.filter(e => e.status === 'present').length;
  const leaveDays = monthEntries.filter(e => e.status === 'leave').length;
  const holidayDays = monthEntries.filter(e => e.status === 'holiday').length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.first_name ?? user?.username}`}
        breadcrumb={['Superuser', 'Dashboard']}
        action={
          <div style={{ position: 'relative' }}>
            <select
              id="dashboard-client-select"
              className="input-field"
              style={{ paddingRight: '2rem', appearance: 'none', minWidth: 180 }}
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value ? Number(e.target.value) : '')}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard label="Total Hours This Month" value={totalHours} icon={<Clock size={22} />} variant="accent" />
        <KPICard label="Present Days" value={presentDays} icon={<Users size={22} />} variant="success" />
        <KPICard label="Leave Days" value={leaveDays} icon={<Coffee size={22} />} variant="warning" />
        <KPICard label="Holiday Days" value={holidayDays} icon={<Palmtree size={22} />} variant="info" />
      </div>

      {/* Today's Entries */}
      <div className="card">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Today's Entries</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{todayStr}</p>
          </div>
          <span className="badge badge-neutral">{todayEntries.length} records</span>
        </div>
        <div className="table-container">
          {loadingToday ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : todayEntries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon"><Clock size={40} /></span>
              <div className="empty-state-title">No entries for today</div>
              <div className="empty-state-desc">Entries will appear here once employees fill their timesheets.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Projects</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayEntries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 500 }}>{entry.employee_name ?? `Employee #${entry.employee}`}</td>
                    <td>
                      {entry.project_hours.map(ph => (
                        <span key={ph.project} className="badge badge-neutral" style={{ marginRight: 4 }}>
                          {ph.project_code ?? `P${ph.project}`}: {ph.hours}h
                        </span>
                      ))}
                    </td>
                    <td className="ts-total-cell">{entry.total_hours}h</td>
                    <td><Badge type={entry.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperuserDashboard;
