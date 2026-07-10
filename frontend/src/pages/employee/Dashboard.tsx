import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import KPICard from '../../components/KPICard';
import PageHeader from '../../components/PageHeader';
import { getEntries } from '../../services/timesheets';
import { Clock, Users, Coffee, Palmtree, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get week number
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };
  const currentWeek = getWeekNumber(now);

  const empId = user?.employee_id;

  const { data: monthEntries = [] } = useQuery({
    queryKey: ['emp-month', empId, currentMonth, currentYear],
    queryFn: () => getEntries({ employee: empId!, month: currentMonth, year: currentYear }),
    enabled: !!empId,
  });

  const totalHours = monthEntries.reduce((s, e) => s + Number(e.total_hours || 0), 0);
  const presentDays = monthEntries.filter(e => e.status === 'present').length;
  const leaveDays = monthEntries.filter(e => e.status === 'leave').length;
  const holidayDays = monthEntries.filter(e => e.status === 'holiday').length;

  const todayEntry = monthEntries.find(e => e.date === todayStr);
  const filledToday = !!todayEntry;

  // This week's entries
  const weekEntries = monthEntries.filter(e => e.week_number === currentWeek);
  const weekProjectHours: Record<string, number> = {};
  weekEntries.forEach(e => {
    e.project_hours.forEach(ph => {
      const code = ph.project_code ?? `P${ph.project}`;
      weekProjectHours[code] = (weekProjectHours[code] ?? 0) + Number(ph.hours || 0);
    });
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.first_name ?? user?.username}`}
        breadcrumb={['Employee', 'Dashboard']}
      />

      <div className="kpi-grid">
        <KPICard label="Total Hours This Month" value={totalHours} icon={<Clock size={22} />} variant="accent" />
        <KPICard label="Present Days" value={presentDays} icon={<Users size={22} />} variant="success" />
        <KPICard label="Leave Days" value={leaveDays} icon={<Coffee size={22} />} variant="warning" />
        <KPICard label="Holiday Days" value={holidayDays} icon={<Palmtree size={22} />} variant="info" />
      </div>

      <div className="dashboard-bottom-grid">
        {/* Today's Status */}
        <div className="card card-padding">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>Today's Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {filledToday ? (
              <CheckCircle size={40} color="var(--success-color)" />
            ) : (
              <XCircle size={40} color="var(--danger-color)" />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: filledToday ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {filledToday ? 'Timesheet Filled' : 'Not Yet Filled'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{todayStr}</div>
            </div>
            {!filledToday && (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => navigate('/employee/my-timesheet')}
              >
                <Zap size={14} /> Fill Now
              </button>
            )}
          </div>
        </div>

        {/* This Week */}
        <div className="card card-padding">
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
            This Week (W{currentWeek})
          </h3>
          {Object.keys(weekProjectHours).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hours logged this week.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(weekProjectHours).map(([code, hours]) => (
                <div key={code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{code}</span>
                  <span className="ts-total-cell" style={{ fontSize: '0.875rem' }}>{hours.toFixed(2)}h</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.25rem', fontWeight: 700 }}>
                <span>Total</span>
                <span className="ts-total-cell">{Object.values(weekProjectHours).reduce((s, h) => s + h, 0).toFixed(2)}h</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
