import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getEntries, updateEntry } from '../../services/timesheets';
import { getClientEmployees } from '../../services/clientEmployees';
import { useToast } from '../../context/ToastContext';
import { Edit2, Calendar } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TeamLeadTimesheets: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const now = new Date();
  const clientId = user?.client_id!;

  const [filters, setFilters] = useState({ employee: '' as number | '', month: now.getMonth() + 1, year: now.getFullYear(), status: '' });
  const [editItem, setEditItem] = useState<any | null>(null);

  const { data: assignments = [] } = useQuery({
    queryKey: ['client-employees', clientId],
    queryFn: () => getClientEmployees({ client: clientId }),
    enabled: !!clientId,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['tl-entries', clientId, filters],
    queryFn: () => getEntries({
      client: clientId,
      employee: filters.employee !== '' ? filters.employee : undefined,
      month: filters.month,
      year: filters.year,
      status: filters.status || undefined,
    }),
    enabled: !!clientId,
  });

  const onUpdate = useMutation({
    mutationFn: () => updateEntry(editItem.id, { description: editItem.description, status: editItem.status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tl-entries'] }); toast.success('Entry updated'); setEditItem(null); },
    onError: () => toast.error('Failed to update'),
  });

  const rowClass = (status: string) => status === 'leave' ? 'row-leave' : status === 'holiday' ? 'row-holiday' : 'row-present';

  return (
    <div>
      <PageHeader title="Timesheets" subtitle={`Manage timesheets for ${user?.client_name ?? 'your client'}`} breadcrumb={['Team Lead', 'Timesheets']} />

      <div className="filter-bar">
        <select className="input-field" style={{ maxWidth: 200 }} value={filters.employee} onChange={e => setFilters(p => ({ ...p, employee: e.target.value ? Number(e.target.value) : '' }))}>
          <option value="">All Employees</option>
          {assignments.map(a => <option key={a.employee} value={a.employee}>{a.employee_name}</option>)}
        </select>
        <select className="input-field" style={{ maxWidth: 120 }} value={filters.month} onChange={e => setFilters(p => ({ ...p, month: Number(e.target.value) }))}>
          {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <input type="number" className="input-field" style={{ maxWidth: 90 }} value={filters.year} onChange={e => setFilters(p => ({ ...p, year: Number(e.target.value) }))} />
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
            <div className="empty-state"><div className="empty-state-icon"><Calendar size={40} /></div><div className="empty-state-title">No entries found</div></div>
          ) : (
            <table>
              <thead><tr><th>Date</th><th>Employee</th><th>Description</th><th>Status</th><th>Total</th><th>Projects</th><th style={{ textAlign: 'center' }}>Edit</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className={rowClass(e.status)}>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.date}</td>
                    <td style={{ fontWeight: 500 }}>{e.employee_name}</td>
                    <td className="text-secondary" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</td>
                    <td><Badge type={e.status} /></td>
                    <td className="ts-total-cell">{e.total_hours}h</td>
                    <td>{e.project_hours.map(ph => <span key={ph.project} className="badge badge-neutral" style={{ marginRight: 3 }}>{ph.project_code}: {ph.hours}h</span>)}</td>
                    <td><div style={{ display: 'flex', justifyContent: 'center' }}><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditItem({ ...e })}><Edit2 size={15} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editItem && (
        <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Entry"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => onUpdate.mutate()} disabled={onUpdate.isPending}>
                {onUpdate.isPending ? <span className="spinner" /> : null}Save
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
    </div>
  );
};

export default TeamLeadTimesheets;
