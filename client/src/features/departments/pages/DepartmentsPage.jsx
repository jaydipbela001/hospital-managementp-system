import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { PageHeader, Button, Input, Modal, Loader } from '../../../components/common';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/departments');
      setDepartments(res?.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      await apiClient('/departments', {
        body: {
          name: name.trim(),
          code: code.trim().toUpperCase() || undefined,
          description: description.trim(),
        },
      });
      setName('');
      setCode('');
      setDescription('');
      setModalOpen(false);
      toast.success('Department created successfully!');
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || 'Error saving department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      await apiClient(`/departments/${id}`, { method: 'DELETE' });
      toast.success('Department deleted successfully!');
      fetchDepartments();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Departments"
        subtitle="Manage hospital medical and administrative departments"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Add Department
          </Button>
        }
      />

      {error && <div style={{ color: 'var(--color-danger, #ef4444)', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <Loader />
      ) : departments.length === 0 ? (
        <p style={{ color: '#64748b' }}>No departments found. Click "+ Add Department" to create one.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          {departments.map((dept) => (
            <div
              key={dept._id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1.25rem',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', color: '#1e293b' }}>{dept.name}</h3>
                  {dept.code && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', letterSpacing: '0.05em' }}>
                      [{dept.code}]
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: dept.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                    color: dept.status === 'ACTIVE' ? '#15803d' : '#64748b',
                  }}
                >
                  {dept.status}
                </span>
              </div>
              <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                {dept.description || 'No description provided.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => handleDelete(dept._id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Department">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Department Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology, Neurology"
              required
            />
            <Input
              label="Department Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CARD, NEURO (auto-generated if empty)"
            />
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                }}
                placeholder="Brief department overview..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Department'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

