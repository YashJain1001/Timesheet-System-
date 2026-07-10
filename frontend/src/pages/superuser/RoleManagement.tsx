import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getClientEmployees, assignClientEmployee, removeClientEmployee } from '../../services/clientEmployees';
import { getClients } from '../../services/clients';
import { getEmployees } from '../../services/employees';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Shield } from 'lucide-react';

const RoleManagement: React.FC = () => {
  const qc = useQueryClient();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ employee: '', client: '', role: 'team_lead' });
  const [errors, setErrors] = useState<any>({});

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['client-employees'],
    queryFn: () => getClientEmployees(),
  });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients });
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const validate = () => {
    const errs: any = {};
    if (!form.employee) errs.employee = 'Select an employee';
    if (!form.client) errs.client = 'Select a client';
    if (!form.role) errs.role = 'Select a role';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onAssign = useMutation({
    mutationFn: () => assignClientEmployee({ employee: Number(form.employee), client: Number(form.client), role: form.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-employees'] });
      toast.success('Assignment created');
      setModalOpen(false);
      setForm({ employee: '', client: '', role: 'team_lead' });
    },
    onError: () => toast.error('Failed to assign — this combination may already exist'),
  });

  const onRemove = useMutation({
    mutationFn: (id: number) => removeClientEmployee(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-employees'] }); toast.success('Assignment removed'); setDeleteId(null); },
    onError: () => toast.error('Failed to remove assignment'),
  });

  return (
    <div>
      <PageHeader
        title="Role Management"
        subtitle="Assign team leads and employees to clients"
        breadcrumb={['Superuser', 'Role Management']}
        action={
          <button id="assign-role-btn" className="btn btn-primary" onClick={() => { setModalOpen(true); setForm({ employee: '', client: '', role: 'team_lead' }); setErrors({}); }}>
            <Plus size={16} /> Assign Role
          </button>
        }
      />

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : assignments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Shield size={40} /></div>
              <div className="empty-state-title">No assignments yet</div>
              <div className="empty-state-desc">Assign employees and team leads to clients.</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Employee</th><th>Client</th><th>Role</th><th>Assigned On</th><th>Assigned By</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.employee_name ?? `Employee #${a.employee}`}</td>
                    <td className="text-secondary">{a.client_name ?? `Client #${a.client}`}</td>
                    <td><Badge type={a.role as any} /></td>
                    <td className="text-secondary">{a.inserted_on ? new Date(a.inserted_on).toLocaleDateString() : '—'}</td>
                    <td className="text-secondary">{a.added_by_name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger-color)' }} onClick={() => setDeleteId(a.id)} title="Remove">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Role"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (validate()) onAssign.mutate(); }} disabled={onAssign.isPending}>
              {onAssign.isPending ? <span className="spinner" /> : null}Assign
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Employee *</label>
            <select className={`input-field${errors.employee ? ' error' : ''}`} value={form.employee} onChange={e => { setForm(p => ({ ...p, employee: e.target.value })); setErrors((p: any) => ({ ...p, employee: undefined })); }}>
              <option value="">Select employee…</option>
              {employees.filter(e => !e.is_superuser).map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.username})</option>)}
            </select>
            {errors.employee && <span className="form-error">{errors.employee}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select className={`input-field${errors.client ? ' error' : ''}`} value={form.client} onChange={e => { setForm(p => ({ ...p, client: e.target.value })); setErrors((p: any) => ({ ...p, client: undefined })); }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.client && <span className="form-error">{errors.client}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select className="input-field" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="team_lead">Team Lead</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Remove Confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Remove Assignment"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={() => onRemove.mutate(deleteId!)} disabled={onRemove.isPending}>{onRemove.isPending ? <span className="spinner" /> : null}Remove</button></>}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to remove this role assignment?</p>
      </Modal>
    </div>
  );
};

export default RoleManagement;
