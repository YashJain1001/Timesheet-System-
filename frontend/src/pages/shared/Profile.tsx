import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [editForm, setEditForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '', number: user?.number ?? '' });
  const [editErrors, setEditErrors] = useState<any>({});

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [pwErrors, setPwErrors] = useState<any>({});
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);

  const validateEdit = () => {
    const errs: any = {};
    if (!editForm.first_name.trim()) errs.first_name = 'First name is required';
    if (!editForm.last_name.trim()) errs.last_name = 'Last name is required';
    if (editForm.number && !/^\+?[\d\s\-]{7,15}$/.test(editForm.number)) errs.number = 'Invalid phone number';
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validatePw = () => {
    const errs: any = {};
    if (!pwForm.old_password) errs.old_password = 'Current password is required';
    if (!pwForm.new_password) errs.new_password = 'New password is required';
    else if (pwForm.new_password.length < 8) errs.new_password = 'Min 8 characters';
    else if (!/[A-Z]/.test(pwForm.new_password)) errs.new_password = 'Must include an uppercase letter';
    else if (!/[0-9]/.test(pwForm.new_password)) errs.new_password = 'Must include a number';
    if (pwForm.new_password !== pwForm.confirm_password) errs.confirm_password = 'Passwords do not match';
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onUpdate = useMutation({
    mutationFn: () => api.patch(`/employees/${user?.employee_id ?? user?.id}/`, {
      first_name: editForm.first_name.trim(),
      last_name: editForm.last_name.trim(),
      number: editForm.number.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Profile updated'); refreshUser(); },
    onError: () => toast.error('Failed to update profile'),
  });

  const onChangePassword = useMutation({
    mutationFn: () => api.post('/change-password/', {
      old_password: pwForm.old_password,
      new_password: pwForm.new_password,
    }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwModalOpen(false);
      setPwForm({ old_password: '', new_password: '', confirm_password: '' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.old_password?.[0] || err.response?.data?.detail || 'Failed to change password';
      setPwErrors((p: any) => ({ ...p, old_password: msg }));
    },
  });

  const initials = user
    ? ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? user.username[0])).toUpperCase()
    : '?';

  const roleLabel = user?.is_superuser ? 'Superuser' : user?.is_team_lead ? 'Team Lead' : 'Employee';

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your account details" breadcrumb={['Profile']} />

      <div className="profile-grid">
        {/* Avatar Card */}
        <div className="card card-padding profile-avatar-card">
          <div className="profile-avatar-circle">
            {initials}
          </div>
          <div className="profile-avatar-info">
            <h3>
              {user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : user?.username}
            </h3>
            <p>{user?.email}</p>
            <div className="profile-avatar-badge">
              <span className={`badge badge-${user?.is_superuser ? 'superuser' : user?.is_team_lead ? 'team_lead' : 'employee'}`} style={{ display: 'inline-flex' }}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="card card-padding">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Personal Information</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <input type="text" className={`input-field${editErrors.first_name ? ' error' : ''}`} value={editForm.first_name} onChange={e => { setEditForm(p => ({ ...p, first_name: e.target.value })); setEditErrors((p: any) => ({ ...p, first_name: undefined })); }} />
                {editErrors.first_name && <span className="form-error"><AlertCircle size={12} />{editErrors.first_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input type="text" className={`input-field${editErrors.last_name ? ' error' : ''}`} value={editForm.last_name} onChange={e => { setEditForm(p => ({ ...p, last_name: e.target.value })); setEditErrors((p: any) => ({ ...p, last_name: undefined })); }} />
                {editErrors.last_name && <span className="form-error"><AlertCircle size={12} />{editErrors.last_name}</span>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" className="input-field" value={user?.username ?? ''} disabled />
              <span className="form-hint">Username cannot be changed</span>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="input-field" value={user?.email ?? ''} disabled />
              <span className="form-hint">Contact admin to change email</span>
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className={`input-field${editErrors.number ? ' error' : ''}`} value={editForm.number} onChange={e => { setEditForm(p => ({ ...p, number: e.target.value })); setEditErrors((p: any) => ({ ...p, number: undefined })); }} placeholder="+91 9876543210" />
              {editErrors.number && <span className="form-error"><AlertCircle size={12} />{editErrors.number}</span>}
            </div>

            <div className="profile-actions">
              <button className="btn btn-primary" onClick={() => { if (validateEdit()) onUpdate.mutate(); }} disabled={onUpdate.isPending}>
                {onUpdate.isPending ? <span className="spinner" /> : <User size={16} />}
                {onUpdate.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary" onClick={() => setPwModalOpen(true)}>
                <Lock size={16} /> Change Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal open={pwModalOpen} onClose={() => { setPwModalOpen(false); setPwErrors({}); setPwForm({ old_password: '', new_password: '', confirm_password: '' }); }} title="Change Password"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setPwModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => { if (validatePw()) onChangePassword.mutate(); }} disabled={onChangePassword.isPending}>
              {onChangePassword.isPending ? <span className="spinner" /> : <Lock size={16} />}
              {onChangePassword.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(['old_password', 'new_password', 'confirm_password'] as const).map((field, i) => {
            const labels = ['Current Password *', 'New Password *', 'Confirm New Password *'];
            const shows = [showOld, showNew, showConfirm];
            const setShows = [setShowOld, setShowNew, setShowConfirm];
            return (
              <div className="form-group" key={field}>
                <label className="form-label">{labels[i]}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={shows[i] ? 'text' : 'password'}
                    className={`input-field${pwErrors[field] ? ' error' : ''}`}
                    value={pwForm[field]}
                    onChange={e => { setPwForm(p => ({ ...p, [field]: e.target.value })); setPwErrors((p: any) => ({ ...p, [field]: undefined })); }}
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button type="button" onClick={() => setShows[i](v => !v)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {shows[i] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors[field] && <span className="form-error"><AlertCircle size={12} />{pwErrors[field]}</span>}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
