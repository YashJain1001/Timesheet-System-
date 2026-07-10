import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getClientEmployees, assignClientEmployee, removeClientEmployee } from '../../services/clientEmployees';
import { getEmployees } from '../../services/employees';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Users, Search } from 'lucide-react';

const TeamLeadEmployees: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selError, setSelError] = useState('');

  const clientId = user?.client_id!;

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['client-employees', clientId],
    queryFn: () => getClientEmployees({ client: clientId }),
    enabled: !!clientId,
  });

  const { data: allEmployees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  // Employees not yet in this client
  const assignedIds = new Set(assignments.map(a => a.employee));
  const availableEmployees = allEmployees.filter(e => !e.is_superuser && !assignedIds.has(e.id));

  const filtered = assignments.filter(a =>
    (a.employee_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.employee_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const onAssign = useMutation({
    mutationFn: () => assignClientEmployee({ employee: Number(selectedEmployee), client: clientId, role: 'employee' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-employees'] }); toast.success('Employee added to client'); setAddOpen(false); setSelectedEmployee(''); },
    onError: () => toast.error('Failed to add employee'),
  });

  const onRemove = useMutation({
    mutationFn: (id: number) => removeClientEmployee(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-employees'] }); toast.success('Employee removed'); setRemoveId(null); },
    onError: () => toast.error('Failed to remove employee'),
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`Employees assigned to ${user?.client_name ?? 'your client'}`}
        breadcrumb={['Team Lead', 'Employees']}
        action={<button className="btn btn-primary" onClick={() => { setAddOpen(true); setSelectedEmployee(''); setSelError(''); }}><Plus size={16} /> Add Employee</button>}
      />

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input type="text" className="input-field" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Users size={40} /></div><div className="empty-state-title">No employees yet</div></div>
          ) : (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Assigned On</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.employee_name ?? `Employee #${a.employee}`}</td>
                    <td className="text-secondary">{a.employee_email ?? '—'}</td>
                    <td><Badge type={a.role as any} /></td>
                    <td className="text-secondary">{a.inserted_on ? new Date(a.inserted_on).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => setRemoveId(a.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Employee to Client"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (!selectedEmployee) { setSelError('Select an employee'); return; } setSelError(''); onAssign.mutate(); }} disabled={onAssign.isPending}>
              {onAssign.isPending ? <span className="spinner" /> : null}Add Employee
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Select Employee *</label>
          <select className={`input-field${selError ? ' error' : ''}`} value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setSelError(''); }}>
            <option value="">Search and select…</option>
            {availableEmployees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.email})</option>)}
          </select>
          {selError && <span className="form-error">{selError}</span>}
          {availableEmployees.length === 0 && <span className="form-hint">All available employees are already assigned to this client.</span>}
        </div>
      </Modal>

      <Modal open={removeId !== null} onClose={() => setRemoveId(null)} title="Remove Employee"
        footer={<><button className="btn btn-secondary" onClick={() => setRemoveId(null)}>Cancel</button><button className="btn btn-danger" onClick={() => onRemove.mutate(removeId!)} disabled={onRemove.isPending}>{onRemove.isPending ? <span className="spinner" /> : null}Remove</button></>}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Remove this employee from your client? They won't be able to log time for this client anymore.</p>
      </Modal>
    </div>
  );
};

export default TeamLeadEmployees;
