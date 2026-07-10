import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getEntries, updateEntry, deleteEntry } from '../../services/timesheets';
import { getClients } from '../../services/clients';
import { getEmployees } from '../../services/employees';
import { useToast } from '../../context/ToastContext';
import { Edit2, Trash2, Calendar } from 'lucide-react';
import EmployeeMyTimesheet from '../EmployeeTimesheet';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const AllTimesheets: React.FC = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const now = new Date();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  const [filters, setFilters] = useState({
    client: '' as number | '',
    employee: '' as number | '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: '',
  });
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['all-entries', filters],
    queryFn: () => getEntries({
      client: filters.client !== '' ? filters.client : undefined,
      employee: filters.employee !== '' ? filters.employee : undefined,
      month: filters.month,
      year: filters.year,
      status: filters.status || undefined,
    }),
  });

  const onDelete = useMutation({
    mutationFn: (id: number) => deleteEntry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-entries'] }); toast.success('Entry deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete entry'),
  });

  const onUpdate = useMutation({
    mutationFn: () => updateEntry(editItem.id, { description: editItem.description, status: editItem.status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-entries'] }); toast.success('Entry updated'); setEditItem(null); },
    onError: () => toast.error('Failed to update entry'),
  });

  const rowClass = (status: string) =>
    status === 'leave' ? 'row-leave' : status === 'holiday' ? 'row-holiday' : 'row-present';

  return (
    <div>
      <PageHeader title="All Timesheets" subtitle="View and manage timesheet entries across all clients" breadcrumb={['Superuser', 'Timesheets']} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.25rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'all' ? '2px solid var(--accent-color)' : '2px solid transparent',
            color: activeTab === 'all' ? 'var(--accent-color)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          All Employee Entries
        </button>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'my' ? '2px solid var(--accent-color)' : '2px solid transparent',
            color: activeTab === 'my' ? 'var(--accent-color)' : 'var(--text-secondary)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          My Timesheet
        </button>
      </div>

      {activeTab === 'all' ? (
        <>
          {/* Filters */}
          <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
            <select className="input-field" style={{ maxWidth: 180 }} value={filters.client} onChange={e => setFilters(p => ({ ...p, client: e.target.value ? Number(e.target.value) : '' }))}>
              <option value="">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input-field" style={{ maxWidth: 200 }} value={filters.employee} onChange={e => setFilters(p => ({ ...p, employee: e.target.value ? Number(e.target.value) : '' }))}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select className="input-field" style={{ maxWidth: 130 }} value={filters.month} onChange={e => setFilters(p => ({ ...p, month: Number(e.target.value) }))}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" className="input-field" style={{ maxWidth: 100 }} value={filters.year} min={2020} max={2100} onChange={e => setFilters(p => ({ ...p, year: Number(e.target.value) }))} />
            <select className="input-field" style={{ maxWidth: 140 }} value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
            </select>
          </div>

          <div className="card">
            <div className="table-container">
              {isLoading ? (
                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
              ) : entries.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon"><Calendar size={40} /></div><div className="empty-state-title">No entries found</div><div className="empty-state-desc">Adjust filters to see entries.</div></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Date</th><th>Week</th><th>Employee</th><th>Client</th><th>Description</th><th>Status</th><th>Total</th><th>Projects</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => (
                      <tr key={entry.id} className={rowClass(entry.status)}>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{entry.date}</td>
                        <td className="text-secondary">W{entry.week_number}</td>
                        <td style={{ fontWeight: 500 }}>{entry.employee_name}</td>
                        <td className="text-secondary">{entry.client_name}</td>
                        <td className="text-secondary" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description || '—'}</td>
                        <td><Badge type={entry.status} /></td>
                        <td className="ts-total-cell">{entry.total_hours}h</td>
                        <td>
                          {entry.project_hours.map(ph => (
                            <span key={ph.project} className="badge badge-neutral" style={{ marginRight: 3 }}>{ph.project_code}: {ph.hours}h</span>
                          ))}
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditItem({ ...entry })}><Edit2 size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => setDeleteId(entry.id)}><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <EmployeeMyTimesheet hideHeader={true} />
      )}

      {/* Edit Modal */}
      {editItem && (
        <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Timesheet Entry"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => onUpdate.mutate()} disabled={onUpdate.isPending}>
                {onUpdate.isPending ? <span className="spinner" /> : null}Save Changes
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="input-field" value={editItem.status} onChange={e => setEditItem((p: any) => ({ ...p, status: e.target.value }))}>
                <option value="present">Present</option>
                <option value="leave">Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="input-field" rows={3} value={editItem.description ?? ''} onChange={e => setEditItem((p: any) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Entry"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={() => onDelete.mutate(deleteId!)} disabled={onDelete.isPending}>{onDelete.isPending ? <span className="spinner" /> : null}Delete</button></>}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Delete this timesheet entry? This cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default AllTimesheets;

