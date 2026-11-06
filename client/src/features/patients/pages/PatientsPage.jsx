import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { PageHeader, Button, Input, Modal, Loader } from '../../../components/common';

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Registration form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [bloodGroup, setBloodGroup] = useState('UNKNOWN');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiClient(`/patients${query}`);
      setPatients(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiClient('/patients', {
        body: {
          name,
          phone,
          email,
          gender,
          bloodGroup,
          dateOfBirth: dateOfBirth || null,
          address,
          emergencyName,
          emergencyPhone,
          allergies,
          medicalHistory,
        },
      });

      toast.success(`Patient registered successfully! Code: ${res?.data?.patientCode || ''}`);
      setModalOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setEmergencyName('');
      setEmergencyPhone('');
      setAllergies('');
      setMedicalHistory('');
      fetchPatients();
    } catch (err) {
      toast.error(err.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  const openDetails = (p) => {
    setSelectedPatient(p);
    setDetailModalOpen(true);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Patient Management"
        subtitle="Search, register, and review patient clinical profiles"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Register Patient
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Search by patient code, name, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchPatients()}
          style={{
            flex: 1,
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
          }}
        />
        <Button variant="outline" onClick={fetchPatients}>
          Search
        </Button>
      </div>

      {loading ? (
        <Loader />
      ) : patients.length === 0 ? (
        <p style={{ color: '#64748b' }}>No patient records found.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Patient Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Gender</th>
                <th style={{ padding: '0.75rem 1rem' }}>Blood</th>
                <th style={{ padding: '0.75rem 1rem' }}>Phone</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4f46e5' }}>
                    {p.patientCode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1e293b' }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.gender}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '2px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {p.bloodGroup}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.phone}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '9999px', background: p.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9', color: p.status === 'ACTIVE' ? '#15803d' : '#64748b', fontSize: '0.75rem' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/appointments', { state: { preselectedPatientId: p._id } })}
                      >
                        Book
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openDetails(p)}>
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Registration Modal */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New Patient">
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input label="Patient Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input label="Primary Phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="UNKNOWN">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <Input
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Input label="Emergency Contact Name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
              <Input label="Emergency Contact Phone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
            </div>

            <Input
              label="Known Allergies (comma-separated)"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Latex"
            />

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Medical History</label>
              <textarea
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                placeholder="Chronic conditions, prior surgeries..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Registering...' : 'Register Patient'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Patient Profile View Modal */}
      {detailModalOpen && selectedPatient && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Patient Profile • ${selectedPatient.patientCode}`}
          maxWidth="580px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
                background: 'var(--color-surface-muted)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Full Name</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>{selectedPatient.name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Phone</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>{selectedPatient.phone}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gender & Blood</span>
                <div style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedPatient.gender} <span style={{ color: 'var(--color-border-strong)' }}>|</span> {selectedPatient.bloodGroup}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Email Address</span>
                <div style={{ fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>{selectedPatient.email || '—'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Date of Birth</span>
                <div style={{ fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>
                  {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : '—'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Residential Address</span>
                <div style={{ fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>{selectedPatient.address || '—'}</div>
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
              <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--color-danger)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Allergies</h4>
              <p style={{ margin: 0, color: '#991b1b', fontSize: '0.875rem' }}>
                {selectedPatient.allergies?.length > 0 ? selectedPatient.allergies.join(', ') : 'No known allergies.'}
              </p>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--color-primary-900)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Medical History</h4>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {selectedPatient.medicalHistory || 'No significant medical history recorded.'}
              </p>
            </div>

            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 0.35rem 0', color: 'var(--color-primary-900)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Emergency Contact</h4>
              <p style={{ margin: 0, color: 'var(--color-text)', fontSize: '0.875rem' }}>
                {selectedPatient.emergencyContact?.name
                  ? `${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.relation || 'Contact'}) • ${selectedPatient.emergencyContact.phone}`
                  : 'None recorded'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
              <Button variant="primary" onClick={() => setDetailModalOpen(false)}>
                Close Profile
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

