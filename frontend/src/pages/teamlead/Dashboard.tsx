import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import { getEntries } from '../../services/timesheets';
import { Clock, Users, Coffee, Palmtree } from 'lucide-react';

const TeamLeadDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Team lead's client is stored in user context
  const clientId = user?.client_id;

  const { data: monthEntries = [] } = useQuery({
    queryKey: ['tl-month-entries', clientId, currentMonth, currentYear],
    queryFn: () => getEntries({ client: clientId!, month: currentMonth, year: currentYear }),
    enabled: !!clientId,
  });

  const { data: todayEntries = [] } = useQuery({
    queryKey: ['tl-today-entries', clientId, todayStr],
    queryFn: () => getEntries({ client: clientId! }),
    select: (data) => data.filter(e => e.date === todayStr),
    enabled: !!clientId,
  });

  const totalHours = monthEntries.reduce((s, e) => s + Number(e.total_hours || 0), 0);
  const presentDays = monthEntries.filter(e => e.status === 'present').length;
  const leaveDays = monthEntries.filter(e => e.status === 'leave').length;
  const holidayDays = monthEntries.filter(e => e.status === 'holiday').length;

  return (
    <div>
      <PageHeader
        title="Team Lead Dashboard"
        subtitle={`${user?.client_name ?? 'Your Client'} — ${user?.first_name ?? user?.username}`}
        breadcrumb={['Team Lead', 'Dashboard']}
      />

      <div className="kpi-grid">
        <KPICard label="Total Hours This Month" value={totalHours} icon={<Clock size={22} />} variant="accent" />
        <KPICard label="Present Days" value={presentDays} icon={<Users size={22} />} variant="success" />
        <KPICard label="Leave Days" value={leaveDays} icon={<Coffee size={22} />} variant="warning" />
        <KPICard label="Holiday Days" value={holidayDays} icon={<Palmtree size={22} />} variant="info" />
      </div>

      <div className="card">
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Today's Entries</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{todayStr} · {user?.client_name}</p>
        </div>
        <div className="table-container">
          {todayEntries.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Clock size={40} /></div><div className="empty-state-title">No entries for today</div></div>
          ) : (
            <table>
              <thead><tr><th>Employee</th><th>Total Hours</th><th>Status</th></tr></thead>
              <tbody>
                {todayEntries.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 500 }}>{entry.employee_name}</td>
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

export default TeamLeadDashboard;
