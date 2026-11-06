import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './OpdPage.css';

const DEFAULT_MEDICINE_ROW = {
  medicineName: '',
  dosage: '1 tablet',
  frequency: '1-0-1',
  duration: '5 days',
  instructions: 'After food',
};

export default function OpdPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const location = useLocation();

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Form state
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    location.state?.preselectedPatientId || ''
  );
  const [appointmentId, setAppointmentId] = useState(
    location.state?.appointmentId || ''
  );
  const [vitals, setVitals] = useState({
    bloodPressure: '',
    pulseRate: '',
    temperature: '',
    spO2: '',
    weightKg: '',
  });
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ ...DEFAULT_MEDICINE_ROW }]);
  const [followUpDate, setFollowUpDate] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/opd');
      setConsultations(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await apiClient('/patients');
      setPatients(res?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchPatients();
    if (location.state?.preselectedPatientId) {
      setModalOpen(true);
    }
  }, [location.state]);

  const handleAddMedicine = () => {
    setPrescriptions([...prescriptions, { ...DEFAULT_MEDICINE_ROW }]);
  };

  const handleRemoveMedicine = (idx) => {
    if (prescriptions.length === 1) return;
    setPrescriptions(prescriptions.filter((_, i) => i !== idx));
  };

  const handleMedicineChange = (idx, field, val) => {
    const updated = [...prescriptions];
    updated[idx][field] = val;
    setPrescriptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.warning('Please select a patient.');
      return;
    }
    if (!diagnosis.trim()) {
      toast.warning('Please enter a clinical diagnosis.');
      return;
    }

    try {
      setSaving(true);
      const validPrescriptions = prescriptions.filter((p) => p.medicineName.trim().length > 0);

      const res = await apiClient('/opd', {
        body: {
          patientId: selectedPatientId,
          appointmentId: appointmentId || null,
          vitals,
          chiefComplaints,
          diagnosis,
          clinicalNotes,
          prescriptions: validPrescriptions,
          followUpDate: followUpDate || null,
        },
      });

      toast.success(res?.message || 'OPD Consultation and Prescription saved!');
      setModalOpen(false);
      // Reset form
      setSelectedPatientId('');
      setAppointmentId('');
      setVitals({ bloodPressure: '', pulseRate: '', temperature: '', spO2: '', weightKg: '' });
      setChiefComplaints('');
      setDiagnosis('');
      setClinicalNotes('');
      setPrescriptions([{ ...DEFAULT_MEDICINE_ROW }]);
      setFollowUpDate('');
      fetchConsultations();
    } catch (err) {
      toast.error(err.message || 'Failed to save OPD consultation');
    } finally {
      setSaving(false);
    }
  };

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: p.name,
    subtext: `ID: ${p.patientCode} • Phone: ${p.phone} • Blood: ${p.bloodGroup || '—'}`,
  }));

  const filteredConsultations = consultations.filter((c) => {
    const q = searchQuery.toLowerCase();
    const patName = c.patientId?.name?.toLowerCase() || '';
    const patCode = c.patientId?.patientCode?.toLowerCase() || '';
    const docName = c.doctorId?.name?.toLowerCase() || '';
    const code = c.opdCode?.toLowerCase() || '';
    const diag = c.diagnosis?.toLowerCase() || '';
    return !q || patName.includes(q) || patCode.includes(q) || docName.includes(q) || code.includes(q) || diag.includes(q);
  });

  return (
    <div className="opd-container" style={{ padding: 'var(--space-6)' }}>
      <PageHeader
        title="OPD Consultations & Prescriptions"
        subtitle="Record clinical examinations, vitals, patient diagnoses, and digital prescriptions"
        actions={
          (isDoctor || user?.role === 'SUPER_ADMIN') && (
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              + New OPD Consultation
            </Button>
          )
        }
      />

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', margin: '1.25rem 0', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="Search patient, diagnosis, or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            height: '40px',
            padding: '0 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            fontSize: 'var(--font-size-sm)',
            outline: 'none',
          }}
        />
      </div>

      {loading ? (
        <Loader />
      ) : filteredConsultations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No OPD consultation records found.</p>
          {(isDoctor || user?.role === 'SUPER_ADMIN') && (
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              Create First Consultation
            </Button>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>OPD Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem' }}>Consulting Doctor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Diagnosis</th>
                <th style={{ padding: '0.75rem 1rem' }}>Prescriptions</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredConsultations.map((c) => (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-800)', fontFamily: 'monospace' }}>
                      {c.opdCode}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.patientId?.name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {c.patientId?.patientCode} • {c.patientId?.gender || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>Dr. {c.doctorId?.name || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{c.diagnosis}</div>
                    {c.chiefComplaints && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.chiefComplaints}</div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Badge variant="primary">{c.prescriptions?.length || 0} Medicines</Badge>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRecord(c);
                        setViewModalOpen(true);
                      }}
                    >
                      View Rx
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New OPD Consultation Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="New OPD Consultation & Prescription"
          maxWidth="680px"
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Patient Picker */}
            <div>
              <CustomSelect
                label="Select Patient"
                required
                options={patientOptions}
                value={selectedPatientId}
                onChange={(val) => setSelectedPatientId(val)}
                placeholder="Search or choose patient..."
              />
            </div>

            {/* Vitals row */}
            <div style={{ background: 'var(--color-surface-muted)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary-900)', textTransform: 'uppercase' }}>
                Patient Vitals (Optional)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>BP (mmHg)</label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={vitals.bloodPressure}
                    onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pulse (bpm)</label>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitals.pulseRate}
                    onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Temp (°F)</label>
                  <input
                    type="number"
                    placeholder="98.6"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>SpO2 (%)</label>
                  <input
                    type="number"
                    placeholder="99"
                    value={vitals.spO2}
                    onChange={(e) => setVitals({ ...vitals, spO2: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Weight (kg)</label>
                  <input
                    type="number"
                    placeholder="70"
                    value={vitals.weightKg}
                    onChange={(e) => setVitals({ ...vitals, weightKg: e.target.value })}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Complaints & Diagnosis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Chief Complaints
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mild fever, dry cough x 3 days"
                  value={chiefComplaints}
                  onChange={(e) => setChiefComplaints(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Clinical Diagnosis <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Upper Respiratory Tract Infection"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}
                />
              </div>
            </div>

            {/* Clinical Notes */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Clinical Observations / Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Doctor's clinical findings and lifestyle recommendations..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.875rem', fontFamily: 'inherit' }}
              />
            </div>

            {/* Prescriptions Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-900)' }}>
                  💊 Prescribed Medications (Rx)
                </span>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  + Add Medication
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {prescriptions.map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1.2fr 30px',
                      gap: '0.35rem',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Medicine Name (e.g. Paracetamol)"
                      value={p.medicineName}
                      onChange={(e) => handleMedicineChange(idx, 'medicineName', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Dosage (500mg)"
                      value={p.dosage}
                      onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Freq (1-0-1)"
                      value={p.frequency}
                      onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Duration (5 days)"
                      value={p.duration}
                      onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Instructions (After food)"
                      value={p.instructions}
                      onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                      style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    {prescriptions.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        style={{ border: 'none', background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up date */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Follow-up Date (Optional)
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.875rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Finalize & Issue Prescription'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Digital Prescription Modal */}
      {viewModalOpen && selectedRecord && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Digital Prescription • ${selectedRecord.opdCode}`}
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <strong>Patient:</strong> {selectedRecord.patientId?.name} ({selectedRecord.patientId?.patientCode})
                <div>Gender / Blood: {selectedRecord.patientId?.gender} | {selectedRecord.patientId?.bloodGroup}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Doctor:</strong> Dr. {selectedRecord.doctorId?.name}
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  Date: {new Date(selectedRecord.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div>
              <strong>Diagnosis:</strong>
              <div style={{ padding: '0.5rem 0.75rem', background: '#f0fdf4', color: '#166534', borderRadius: '6px', marginTop: '4px', fontWeight: 600 }}>
                {selectedRecord.diagnosis}
              </div>
            </div>

            {selectedRecord.clinicalNotes && (
              <div>
                <strong>Clinical Notes:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)' }}>{selectedRecord.clinicalNotes}</p>
              </div>
            )}

            <div>
              <strong>Medications (Rx):</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '6px' }}>Medicine</th>
                    <th style={{ padding: '6px' }}>Dosage</th>
                    <th style={{ padding: '6px' }}>Frequency</th>
                    <th style={{ padding: '6px' }}>Duration</th>
                    <th style={{ padding: '6px' }}>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.prescriptions?.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{p.medicineName}</td>
                      <td style={{ padding: '6px' }}>{p.dosage}</td>
                      <td style={{ padding: '6px' }}>{p.frequency}</td>
                      <td style={{ padding: '6px' }}>{p.duration}</td>
                      <td style={{ padding: '6px', color: '#64748b' }}>{p.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="primary" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

