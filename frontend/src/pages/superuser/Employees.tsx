import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, toggleEmployeeStatus } from '../../services/employees';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, Search, Users, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';

const Employees: React.FC = () => {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ username: '', first_name: '', last_name: '', email: '', number: '', password: '' });
  const [errors, setErrors] = useState<any>({});

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });

  const filtered = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name} ${emp.email} ${emp.username}`.toLowerCase().includes(search.toLowerCase())
  );

  const validate = () => {
    const errs: any = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errs.username = 'Only letters, numbers and _ allowed';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.number && !/^\+?[\d\s\-]{7,15}$/.test(form.number)) errs.number = 'Invalid phone number';
    if (!editItem) {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Min 8 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = useMutation({
    mutationFn: () => editItem
      ? updateEmployee(editItem.id, { first_name: form.first_name, last_name: form.last_name, email: form.email, number: form.number || undefined })
      : createEmployee({ username: form.username, first_name: form.first_name, last_name: form.last_name, email: form.email, number: form.number || undefined, password: form.password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(editItem ? 'Employee updated' : 'Employee created');
      setModalOpen(false); setEditItem(null);
      setForm({ username: '', first_name: '', last_name: '', email: '', number: '', password: '' });
    },
    onError: () => toast.error('Failed to save employee'),
  });

  const onDelete = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete employee'),
  });

  const onToggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => toggleEmployeeStatus(id, is_active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ username: '', first_name: '', last_name: '', email: '', number: '', password: '' });
    setErrors({}); setShowPass(false); setModalOpen(true);
  };

  const openEdit = (emp: any) => {
    setEditItem(emp);
    setForm({ username: emp.username, first_name: emp.first_name, last_name: emp.last_name, email: emp.email, number: emp.number ?? '', password: '' });
    setErrors({}); setShowPass(false); setModalOpen(true);
  };

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors((p: any) => ({ ...p, [field]: undefined }));
  };

  return (
    <div>
      <PageHeader
        title="Employee Management"
        subtitle="Create and manage employee accounts"
        breadcrumb={['Superuser', 'Employees']}
        action={<button id="add-employee-btn" className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Employee</button>}
      />

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input type="text" className="input-field" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Users size={40} /></div><div className="empty-state-title">No employees found</div></div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</td>
                    <td className="text-secondary">{emp.username}</td>
                    <td className="text-secondary">{emp.email}</td>
                    <td className="text-secondary">{emp.number ?? '—'}</td>
                    <td><Badge type={emp.is_superuser ? 'superuser' : 'employee'} /></td>
                    <td><Badge type={emp.is_active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title={emp.is_active ? 'Deactivate' : 'Activate'} onClick={() => onToggle.mutate({ id: emp.id, is_active: !emp.is_active })} style={{ color: emp.is_active ? 'var(--success-color)' : 'var(--text-muted)' }}>
                          {emp.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(emp)}><Edit2 size={15} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--danger-color)' }} onClick={() => setDeleteId(emp.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? 'Edit Employee' : 'Add Employee'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (validate()) onSave.mutate(); }} disabled={onSave.isPending}>
              {onSave.isPending ? <span className="spinner" /> : null}{editItem ? 'Save Changes' : 'Create Employee'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name *</label>
              <input type="text" className={`input-field${errors.first_name ? ' error' : ''}`} value={form.first_name} onChange={f('first_name')} placeholder="John" />
              {errors.first_name && <span className="form-error">{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name *</label>
              <input type="text" className={`input-field${errors.last_name ? ' error' : ''}`} value={form.last_name} onChange={f('last_name')} placeholder="Doe" />
              {errors.last_name && <span className="form-error">{errors.last_name}</span>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Username *</label>
            <input type="text" className={`input-field${errors.username ? ' error' : ''}`} value={form.username} onChange={f('username')} placeholder="john_doe" disabled={!!editItem} />
            {errors.username ? <span className="form-error">{errors.username}</span> : editItem && <span className="form-hint">Username cannot be changed</span>}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className={`input-field${errors.email ? ' error' : ''}`} value={form.email} onChange={f('email')} placeholder="john@company.com" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="tel" className={`input-field${errors.number ? ' error' : ''}`} value={form.number} onChange={f('number')} placeholder="+91 9876543210" />
              {errors.number && <span className="form-error">{errors.number}</span>}
            </div>
          </div>
          {!editItem && (
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} className={`input-field${errors.password ? ' error' : ''}`} value={form.password} onChange={f('password')} placeholder="Min 8 characters" style={{ paddingRight: '2.75rem' }} />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Employee"
        footer={<><button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={() => onDelete.mutate(deleteId!)} disabled={onDelete.isPending}>{onDelete.isPending ? <span className="spinner" /> : null}Delete</button></>}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this employee? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default Employees;
