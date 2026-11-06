import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { PageHeader, Button, Input, Select, Modal, Loader } from '../../../components/common';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiClient(`/staff${query}`);
      setStaff(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await apiClient('/departments');
      setDepartments(res?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('role', role);
      if (departmentId) formData.append('departmentId', departmentId);
      if (role === 'DOCTOR') {
        formData.append('specialization', specialization);
        formData.append('consultationFee', consultationFee || '0');
      }
      if (avatar) {
        formData.append('avatar', avatar);
      }

      await apiClient('/staff', { body: formData });
      toast.success('Staff member created successfully!');
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setAvatar(null);
      setAvatarPreview('');
      setShowPassword(false);
      fetchStaff();
    } catch (err) {
      toast.error(err.message || 'Error creating staff');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Staff & Doctor Management"
        subtitle="View and manage hospital clinicians, nurses, and operational staff"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Add Staff Member
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Search staff by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchStaff()}
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
          }}
        />
        <Button variant="outline" onClick={fetchStaff}>
          Search
        </Button>
      </div>

      {loading ? (
        <Loader />
      ) : staff.length === 0 ? (
        <p style={{ color: '#64748b' }}>No staff members found.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>User</th>
                <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                <th style={{ padding: '0.75rem 1rem' }}>Phone</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {u.avatarUrl ? (
                      <img
                        src={`http://localhost:5000${u.avatarUrl}`}
                        alt={u.name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: '#475569',
                        }}
                      >
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{u.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                    {u.departmentId?.name || '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{u.phone || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                        color: u.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                        fontSize: '0.75rem',
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            
            <div className="form-field">
              <label className="form-label">
                Password <span className="required-star">*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  placeholder="Enter temporary password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                    padding: 0,
                    color: '#64748b',
                  }}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="LAB_TECHNICIAN">Lab Technician</option>
                <option value="HOSPITAL_ADMIN">Hospital Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="">None / Unassigned</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {role === 'DOCTOR' && (
              <>
                <Input
                  label="Specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cardiologist"
                />
                <Input
                  label="Consultation Fee"
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="e.g. 50"
                />
              </>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                Avatar Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  setAvatar(file);
                  if (file) {
                    setAvatarPreview(URL.createObjectURL(file));
                  } else {
                    setAvatarPreview('');
                  }
                }}
              />
              {avatarPreview && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #cbd5e1' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Image preview ready</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Staff'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

