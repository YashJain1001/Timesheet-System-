import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { getClients, createClient, updateClient, deleteClient } from '../../services/clients';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, Search, Building2 } from 'lucide-react';

const Clients: React.FC = () => {
  const qc = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: number; name: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [nameErr, setNameErr] = useState('');

  const { data: clients = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: getClients });

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const onCreate = useMutation({
    mutationFn: () => createClient({ name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created successfully');
      setAddOpen(false);
      setName('');
    },
    onError: () => toast.error('Failed to create client'),
  });

  const onUpdate = useMutation({
    mutationFn: () => updateClient(editItem!.id, { name: name.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
      setEditItem(null);
      setName('');
    },
    onError: () => toast.error('Failed to update client'),
  });

  const onDelete = useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete client'),
  });

  const validateAndSubmit = () => {
    if (!name.trim()) { setNameErr('Client name is required'); return; }
    if (name.trim().length < 2) { setNameErr('Name must be at least 2 characters'); return; }
    setNameErr('');
    editItem ? onUpdate.mutate() : onCreate.mutate();
  };

  const openEdit = (c: { id: number; name: string }) => {
    setEditItem(c);
    setName(c.name);
    setNameErr('');
  };

  const openAdd = () => {
    setAddOpen(true);
    setName('');
    setNameErr('');
  };

  return (
    <div>
      <PageHeader
        title="Client Management"
        subtitle="Manage all clients in the system"
        breadcrumb={['Superuser', 'Clients']}
        action={
          <button id="add-client-btn" className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Client
          </button>
        }
      />

      {/* Search */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="input-field"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Building2 size={40} /></div>
              <div className="empty-state-title">No clients found</div>
              <div className="empty-state-desc">{search ? 'Try a different search term.' : 'Add your first client to get started.'}</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Created By</th>
                  <th>Created On</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted text-xs">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="text-secondary">{c.inserted_by_name ?? '—'}</td>
                    <td className="text-secondary">{c.inserted_on ? new Date(c.inserted_on).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => openEdit(c)}>
                          <Edit2 size={15} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Delete" style={{ color: 'var(--danger-color)' }} onClick={() => setDeleteId(c.id)}>
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

      {/* Add / Edit Modal */}
      <Modal
        open={addOpen || !!editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); setName(''); setNameErr(''); }}
        title={editItem ? 'Edit Client' : 'Add New Client'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setAddOpen(false); setEditItem(null); }}>Cancel</button>
            <button
              id="client-save-btn"
              className="btn btn-primary"
              onClick={validateAndSubmit}
              disabled={onCreate.isPending || onUpdate.isPending}
            >
              {(onCreate.isPending || onUpdate.isPending) ? <span className="spinner" /> : null}
              {editItem ? 'Save Changes' : 'Create Client'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Client Name *</label>
          <input
            id="client-name-input"
            type="text"
            className={`input-field${nameErr ? ' error' : ''}`}
            value={name}
            onChange={e => { setName(e.target.value); setNameErr(''); }}
            placeholder="e.g. Acme Corporation"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') validateAndSubmit(); }}
          />
          {nameErr && <span className="form-error">{nameErr}</span>}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Client"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
            <button
              className="btn btn-danger"
              onClick={() => onDelete.mutate(deleteId!)}
              disabled={onDelete.isPending}
            >
              {onDelete.isPending ? <span className="spinner" /> : null}
              Delete
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this client? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default Clients;
