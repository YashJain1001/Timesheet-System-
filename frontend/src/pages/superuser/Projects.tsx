import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { getProjects, createProject, updateProject, deleteProject, toggleProjectStatus } from '../../services/projects';
import { getClients } from '../../services/clients';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, Search, Briefcase, ToggleLeft, ToggleRight } from 'lucide-react';

const Projects: React.FC = () => {
  const qc = useQueryClient();
  const toast = useToast();

  const [filterClient, setFilterClient] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', client: '', is_active: true });
  const [errors, setErrors] = useState<any>({});

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients });
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', filterClient],
    queryFn: () => getProjects(filterClient !== '' ? filterClient : undefined),
  });

  const filtered = projects.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const validate = () => {
    const errs: any = {};
    if (!form.client) errs.client = 'Client is required';
    if (!form.name.trim()) errs.name = 'Project name is required';
    if (!form.code.trim()) errs.code = 'Project code is required';
    else if (!/^[A-Z0-9_-]+$/i.test(form.code)) errs.code = 'Code can only contain letters, numbers, _ and -';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSave = useMutation({
    mutationFn: () => editItem
      ? updateProject(editItem.id, { name: form.name, code: form.code.toUpperCase(), description: form.description, client: Number(form.client), is_active: form.is_active })
      : createProject({ name: form.name, code: form.code.toUpperCase(), description: form.description, client: Number(form.client), is_active: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(editItem ? 'Project updated' : 'Project created');
      setModalOpen(false); setEditItem(null);
      setForm({ name: '', code: '', description: '', client: '', is_active: true });
    },
    onError: () => toast.error('Failed to save project'),
  });

  const onDelete = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); setDeleteId(null); },
    onError: () => toast.error('Failed to delete project'),
  });

  const onToggle = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => toggleProjectStatus(id, is_active),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', code: '', description: '', client: filterClient !== '' ? String(filterClient) : '', is_active: true });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditItem(p);
    setForm({ name: p.name, code: p.code, description: p.description ?? '', client: String(p.client), is_active: p.is_active });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = () => { if (validate()) onSave.mutate(); };

  return (
    <div>
      <PageHeader
        title="Project Management"
        subtitle="Create and manage projects by client"
        breadcrumb={['Superuser', 'Projects']}
        action={<button id="add-project-btn" className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Project</button>}
      />

      <div className="filter-bar">
        <div className="search-input-wrap" style={{ maxWidth: 260 }}>
          <Search size={15} className="search-icon" />
          <input type="text" className="input-field" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field" style={{ maxWidth: 200 }} value={filterClient} onChange={e => setFilterClient(e.target.value ? Number(e.target.value) : '')}>
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon"><Briefcase size={40} /></div><div className="empty-state-title">No projects found</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Project Name</th><th>Code</th><th>Client</th><th>Status</th><th>Created By</th><th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><code style={{ fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '0.2rem 0.4rem', borderRadius: 4 }}>{p.code}</code></td>
                    <td className="text-secondary">{p.client_name ?? `Client #${p.client}`}</td>
                    <td><Badge type={p.is_active ? 'active' : 'inactive'} /></td>
                    <td className="text-secondary">{p.inserted_by_name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title={p.is_active ? 'Deactivate' : 'Activate'} onClick={() => onToggle.mutate({ id: p.id, is_active: !p.is_active })} style={{ color: p.is_active ? 'var(--success-color)' : 'var(--text-muted)' }}>
                          {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(p)}><Edit2 size={15} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--danger-color)' }} onClick={() => setDeleteId(p.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? 'Edit Project' : 'Add Project'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={onSave.isPending}>
              {onSave.isPending ? <span className="spinner" /> : null}{editItem ? 'Save Changes' : 'Create Project'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Client *</label>
            <select className={`input-field${errors.client ? ' error' : ''}`} value={form.client} onChange={e => { setForm(p => ({ ...p, client: e.target.value })); setErrors((p: any) => ({ ...p, client: undefined })); }}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.client && <span className="form-error">{errors.client}</span>}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input type="text" className={`input-field${errors.name ? ' error' : ''}`} value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors((p: any) => ({ ...p, name: undefined })); }} placeholder="e.g. Website Redesign" />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Project Code *</label>
              <input type="text" className={`input-field${errors.code ? ' error' : ''}`} value={form.code} onChange={e => { setForm(p => ({ ...p, code: e.target.value.toUpperCase() })); setErrors((p: any) => ({ ...p, code: undefined })); }} placeholder="e.g. WEB-001" />
              {errors.code && <span className="form-error">{errors.code}</span>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional project description…" />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Project"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => onDelete.mutate(deleteId!)} disabled={onDelete.isPending}>
              {onDelete.isPending ? <span className="spinner" /> : null}Delete
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete this project? This cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default Projects;
