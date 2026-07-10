import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import { getAuditLogs } from '../../services/auditLog';
import { getEmployees } from '../../services/employees';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

const AuditLog: React.FC = () => {
  const [filters, setFilters] = useState({ table_name: '', action_type: '', employee: '' as number | '' });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs({
      table_name: filters.table_name || undefined,
      action_type: filters.action_type || undefined,
      employee: filters.employee !== '' ? filters.employee : undefined,
    }),
  });

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const ACTION_COLORS: Record<string, string> = {
    CREATE: 'var(--success-color)',
    UPDATE: 'var(--warning-color)',
    DELETE: 'var(--danger-color)',
  };

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Read-only log of all system changes" breadcrumb={['Superuser', 'Audit Log']} />

      <div className="filter-bar">
        <input type="text" className="input-field" style={{ maxWidth: 180 }} placeholder="Filter by table…" value={filters.table_name} onChange={e => setFilters(p => ({ ...p, table_name: e.target.value }))} />
        <select className="input-field" style={{ maxWidth: 160 }} value={filters.action_type} onChange={e => setFilters(p => ({ ...p, action_type: e.target.value }))}>
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <select className="input-field" style={{ maxWidth: 200 }} value={filters.employee} onChange={e => setFilters(p => ({ ...p, employee: e.target.value ? Number(e.target.value) : '' }))}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><BookOpen size={40} /></div><div className="empty-state-title">No audit logs found</div></div>
          ) : (
            <table>
              <thead>
                <tr><th>Date / Time</th><th>Employee</th><th>Table</th><th>Record ID</th><th>Action</th><th>Reason</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td className="text-secondary" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(log.inserted_on).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.employee_name ?? '—'}</td>
                      <td><code style={{ fontSize: '0.78rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{log.table_name}</code></td>
                      <td className="text-secondary">{log.record_id ?? '—'}</td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: ACTION_COLORS[log.action_type] ?? 'var(--text-secondary)' }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.8rem' }}>{log.change_reason || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                          {expandedId === log.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-tertiary)', padding: '1rem' }}>
                          <div className="grid-2" style={{ gap: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Old Data</div>
                              <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)', maxHeight: 200, overflowY: 'auto' }}>
                                {log.old_data ? JSON.stringify(log.old_data, null, 2) : 'N/A'}
                              </pre>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>New Data</div>
                              <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border-color)', maxHeight: 200, overflowY: 'auto' }}>
                                {log.new_data ? JSON.stringify(log.new_data, null, 2) : 'N/A'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
