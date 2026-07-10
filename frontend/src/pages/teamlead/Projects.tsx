import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getProjects, createProject, updateProject, toggleProjectStatus } from '../../services/projects';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Briefcase, ToggleLeft, ToggleRight } from 'lucide-react';

const TeamLeadProjects: React.FC = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const clientId = user?.client_id!;

  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [errors, setErrors] = useState<any>({});

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: () => getProjects(clientId),
    enabled: !!clientId,
  });

  const validate = () => {
    const errs: any = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    if (!form.code.trim()) errs.code = 'Project code is required';
    else if (!/^[A-Z0-9_-]+$/i.test(form.code)) errs.code = 'Code: letters, numbers, _ and - only';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = useMutation({
    mutationFn: () => editItem
      ? updateProject(editItem.id, { name: form.name, code: form.code.toUpperCase(), description: form.description })
      : createProject({ name: form.name, code: form.code.toUpperCase(), description: form.description, client: clientId, is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(editItem ? 'Project updated' : 'Project created');
      setModalOpen(false); setEditItem(null);
      setForm({ name: '', code: '', description: '' });
    },
    onError: () => toast.error('Failed to save project'),
  });

  const onToggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => toggleProjectStatus(id, is_active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const openAdd = () => { setEditItem(null); setForm({ name: '', code: '', description: '' }); setErrors({}); setModalOpen(true); };
  const openEdit = (p: any) => { setEditItem(p); setForm({ name: p.name, code: p.code, description: p.description ?? '' }); setErrors({}); setModalOpen(true); };

  return (
    <div>
      <PageHeader title="Projects" subtitle={`Projects under ${user?.client_name ?? 'your client'}`} breadcrumb={['Team Lead', 'Projects']}
        action={<button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Project</button>}
      />

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : projects.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Briefcase size={40} /></div><div className="empty-state-title">No projects yet</div></div>
          ) : (
            <table>
              <thead><tr><th>Name</th><th>Code</th><th>Status</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><code style={{ fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{p.code}</code></td>
                    <td><Badge type={p.is_active ? 'active' : 'inactive'} /></td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title={p.is_active ? 'Deactivate' : 'Activate'} onClick={() => onToggle.mutate({ id: p.id, is_active: !p.is_active })} style={{ color: p.is_active ? 'var(--success-color)' : 'var(--text-muted)' }}>
                          {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Edit2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? 'Edit Project' : 'Add Project'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (validate()) onSave.mutate(); }} disabled={onSave.isPending}>
              {onSave.isPending ? <span className="spinner" /> : null}{editItem ? 'Save Changes' : 'Create Project'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input type="text" className={`input-field${errors.name ? ' error' : ''}`} value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors((p: any) => ({ ...p, name: undefined })); }} placeholder="e.g. Mobile App" />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input type="text" className={`input-field${errors.code ? ' error' : ''}`} value={form.code} onChange={e => { setForm(p => ({ ...p, code: e.target.value.toUpperCase() })); setErrors((p: any) => ({ ...p, code: undefined })); }} placeholder="MOB-001" />
              {errors.code && <span className="form-error">{errors.code}</span>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional…" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamLeadProjects;
