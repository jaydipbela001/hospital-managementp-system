import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { dataCache } from '../../../services/dataCache';
import { PageHeader, Button, Input, Modal, Loader, Pagination } from '../../../components/common';

export default function PatientsPage() {
  const tableWrapRef = useRef(null);
  const navigate = useNavigate();
  const currentLimit = dataCache.getLimit('patients', 5);
  const cached = dataCache.get(`patients_page_1_${currentLimit}`);
  const [patients, setPatients] = useState(cached?.data || []);
  const [initialLoading, setInitialLoading] = useState(!cached);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(currentLimit);
  const [meta, setMeta] = useState(cached?.meta || { page: 1, limit: currentLimit, total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep track of latest search term for race-condition prevention
  const latestSearchRef = useRef(search);
  latestSearchRef.current = search;

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

  const fetchPatients = async (searchTerm = search, pageNum = page, limitNum = limit, isLive = false) => {
    try {
      if (isLive) {
        setIsSearching(true);
      } else {
        setInitialLoading(true);
      }
      const term = (searchTerm ?? '').trim();
      const params = new URLSearchParams();
      if (term) params.append('search', term);
      params.append('page', pageNum);
      params.append('limit', limitNum);

      const res = await apiClient(`/patients?${params.toString()}`);
      
      // Prevent stale response overwrite
      if (latestSearchRef.current.trim() === term) {
        setPatients(res?.data || []);
        if (res?.meta) {
          setMeta(res.meta);
        }
        if (!term && pageNum === 1) {
          dataCache.set(`patients_page_1_${limitNum}`, { data: res?.data || [], meta: res?.meta });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isLive) {
        setIsSearching(false);
      } else {
        setInitialLoading(false);
      }
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchPatients('', 1, limit, false);
  }, []);

  // Debounced live search as user types without full-page loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPatients(search, 1, limit, true);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  const handleManualSearch = () => {
    setPage(1);
    fetchPatients(search, 1, limit, true);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (meta.totalPages || 1) || newPage === page) return;
    setPage(newPage);
    fetchPatients(search, newPage, limit, true);
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    dataCache.setLimit('patients', newLimit);
    setPage(1);
    fetchPatients(search, 1, newLimit, true);
    if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
  };

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
      fetchPatients(search, 1, limit, false);
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
    <div style={{ padding: '0.2rem' }}>
      <PageHeader
        title="Patient Management"
        subtitle="Search, register, and review patient clinical profiles"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            + Register Patient
          </Button>
        }
      />

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by patient code, name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.6rem 2.25rem 0.6rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchPatients('', true);
              }}
              title="Clear search"
              style={{
                position: 'absolute',
                right: '0.75rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1rem',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleManualSearch}
          disabled={isSearching}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, padding: '0.6rem 1rem' }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {initialLoading && patients.length === 0 ? (
        <Loader />
      ) : patients.length === 0 ? (
        <div style={{ padding: '2.5rem', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            {search.trim() ? `No patient records found matching "${search}".` : 'No patient records found.'}
          </p>
          {search.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                fetchPatients('', true);
              }}
              style={{
                marginTop: '0.5rem',
                background: 'none',
                border: 'none',
                color: '#0f766e',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className={`reception-table-card ${isSearching ? 'filtering' : ''}`} style={{ minHeight: '480px' }}>
          {isSearching && (
            <div className="table-filter-progress-bar">
              <div className="filter-progress-indeterminate"></div>
            </div>
          )}
          <div ref={tableWrapRef} className="reception-table-wrap" style={{ minHeight: '380px' }}>
            <table className="reception-queue-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
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
              <tbody className="fade-in-rows">
                {patients.map((p) => (
                  <tr key={p._id} className="smooth-table-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
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
            <div className="reception-table-spacer"></div>
          </div>

          <div className="reception-pagination-wrap" style={{ marginTop: 'auto' }}>
            <Pagination
              page={page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={limit}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="patients"
            />
          </div>
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
                  style={{ width: '100%', height: '40px' }}
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
                  style={{ width: '100%', height: '40px' }}
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

