import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './IpdPage.css';

export default function IpdPage() {
  const { user } = useAuth();
  const canAdmit = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(user?.role);
  const canAddCareNote = ['SUPER_ADMIN', 'DOCTOR', 'NURSE'].includes(user?.role);
  const canDischarge = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('BEDS'); // 'BEDS' or 'ADMISSIONS'
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admission Modal
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [savingAdmit, setSavingAdmit] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState(user?.role === 'DOCTOR' ? (user?.id || user?._id) : '');
  const [selectedBedId, setSelectedBedId] = useState('');
  const [admissionReason, setAdmissionReason] = useState('');

  // Care Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [activeAdmission, setActiveAdmission] = useState(null);
  const [careNoteText, setCareNoteText] = useState('');
  const [vitals, setVitals] = useState({ bloodPressure: '', pulseRate: '', temperature: '', spO2: '' });

  // Discharge Modal
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [conditionAtDischarge, setConditionAtDischarge] = useState('Stable & Recovered');
  const [dischargeAdvice, setDischargeAdvice] = useState('Follow up in 7 days or SOS');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bedsRes, admRes] = await Promise.all([
        apiClient('/ipd/beds'),
        apiClient('/ipd'),
      ]);
      setBeds(bedsRes?.data || []);
      setAdmissions(admRes?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        apiClient('/patients'),
        apiClient('/staff?role=DOCTOR').catch(() => ({ data: [] })),
      ]);
      setPatients(patRes?.data || []);
      setDoctors(docRes?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, []);

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedBedId || !admissionReason.trim()) {
      toast.warning('Please select a patient, an available bed, and enter an admission reason.');
      return;
    }

    try {
      setSavingAdmit(true);
      await apiClient('/ipd/admit', {
        body: {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId || (user?.id || user?._id),
          bedId: selectedBedId,
          admissionReason,
        },
      });

      toast.success('Patient admitted to IPD successfully!');
      setAdmitModalOpen(false);
      setSelectedPatientId('');
      setSelectedBedId('');
      setAdmissionReason('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Admission failed');
    } finally {
      setSavingAdmit(false);
    }
  };

  const handleAddCareNote = async (e) => {
    e.preventDefault();
    if (!careNoteText.trim()) {
      toast.warning('Please enter a clinical note.');
      return;
    }
    try {
      await apiClient(`/ipd/${activeAdmission._id}/care-notes`, {
        body: { note: careNoteText, vitals },
      });
      toast.success('Care note logged successfully!');
      setNoteModalOpen(false);
      setCareNoteText('');
      setVitals({ bloodPressure: '', pulseRate: '', temperature: '', spO2: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to add care note');
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();
    try {
      await apiClient(`/ipd/${activeAdmission._id}/discharge`, {
        body: { conditionAtDischarge, dischargeAdvice },
      });
      toast.success('Patient successfully discharged and bed released!');
      setDischargeModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to discharge patient');
    }
  };

  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE');

  const bedOptions = availableBeds.map((b) => ({
    value: b._id,
    label: `${b.ward} • Room ${b.roomNumber} • Bed ${b.bedNumber}`,
    subtext: `₹${b.dailyRate}/day`,
  }));

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: p.name,
    subtext: `ID: ${p.patientCode} • Phone: ${p.phone} • Blood: ${p.bloodGroup || '—'}`,
  }));

  const doctorOptions = doctors.map((d) => ({
    value: d._id,
    label: `Dr. ${d.name}`,
    subtext: d.departmentId?.name || 'Inpatient Attending',
  }));

  return (
    <div className="ipd-container" style={{ padding: 'var(--space-6)' }}>
      <PageHeader
        title="Inpatient Department (IPD) & Wards"
        subtitle="Manage bed allocations, ward occupancy, patient admissions, and clinical care rounds"
        actions={
          canAdmit && (
            <Button variant="primary" onClick={() => setAdmitModalOpen(true)}>
              + Admit Patient
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', margin: '1.25rem 0' }}>
        <button
          type="button"
          onClick={() => setActiveTab('BEDS')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'BEDS' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'BEDS' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🛏️ Bed Occupancy Matrix ({beds.filter((b) => b.status === 'AVAILABLE').length} Free)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ADMISSIONS')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
            background: activeTab === 'ADMISSIONS' ? 'var(--color-primary-900)' : '#fff',
            color: activeTab === 'ADMISSIONS' ? '#fff' : 'var(--color-text)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📋 Inpatient Admissions ({admissions.filter((a) => a.status === 'ADMITTED').length} Admitted)
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : activeTab === 'BEDS' ? (
        /* Bed Matrix Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {beds.map((b) => {
            const isOcc = b.status === 'OCCUPIED';
            return (
              <div
                key={b._id}
                style={{
                  background: isOcc ? '#fff' : 'var(--color-surface)',
                  border: isOcc ? '2px solid #ef4444' : '1px solid #10b981',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                    Bed {b.bedNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: isOcc ? '#fee2e2' : '#d1fae5',
                      color: isOcc ? '#b91c1c' : '#047857',
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {b.ward} • Room {b.roomNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-700)', fontWeight: 600, marginTop: '2px' }}>
                  ₹{b.dailyRate}/day
                </div>

                {isOcc && b.currentAdmissionId ? (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{b.currentAdmissionId.patientId?.name}</div>
                    <div style={{ color: '#64748b' }}>Attending: Dr. {b.currentAdmissionId.doctorId?.name}</div>
                    <div style={{ color: '#64748b' }}>Admitted: {new Date(b.currentAdmissionId.admissionDate).toLocaleDateString()}</div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#059669', fontWeight: 500 }}>
                    ✓ Ready for admission
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Admissions Table */
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-muted)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem' }}>Bed / Ward</th>
                <th style={{ padding: '0.75rem 1rem' }}>Doctor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Admitted</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map((adm) => (
                <tr key={adm._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-800)' }}>
                    {adm.admissionCode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{adm.patientId?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {adm.patientId?.patientCode} • {adm.patientId?.bloodGroup}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {adm.bedId?.ward} — Bed {adm.bedId?.bedNumber} (Rm {adm.bedId?.roomNumber})
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>Dr. {adm.doctorId?.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(adm.admissionDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: adm.status === 'ADMITTED' ? '#fee2e2' : '#f1f5f9',
                        color: adm.status === 'ADMITTED' ? '#b91c1c' : '#475569',
                      }}
                    >
                      {adm.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      {adm.status === 'ADMITTED' && canAddCareNote && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveAdmission(adm);
                            setNoteModalOpen(true);
                          }}
                        >
                          + Vitals/Note
                        </Button>
                      )}
                      {adm.status === 'ADMITTED' && canDischarge && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveAdmission(adm);
                            setDischargeModalOpen(true);
                          }}
                        >
                          Discharge
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admit Patient Modal */}
      {admitModalOpen && (
        <Modal
          isOpen={admitModalOpen}
          onClose={() => setAdmitModalOpen(false)}
          title="Admit Patient to IPD Ward"
          maxWidth="560px"
        >
          <form onSubmit={handleAdmitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CustomSelect
              label="Select Patient"
              required
              options={patientOptions}
              value={selectedPatientId}
              onChange={(val) => setSelectedPatientId(val)}
              placeholder="Search or choose patient..."
            />

            {user?.role !== 'DOCTOR' && (
              <CustomSelect
                label="Assign Attending Doctor"
                required
                options={doctorOptions}
                value={selectedDoctorId}
                onChange={(val) => setSelectedDoctorId(val)}
                placeholder="Choose attending doctor..."
              />
            )}

            <CustomSelect
              label="Select Available Bed"
              required
              options={bedOptions}
              value={selectedBedId}
              onChange={(val) => setSelectedBedId(val)}
              placeholder="Select an unoccupied bed..."
            />

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Reason for Admission / Preliminary Diagnosis <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Post-op recovery, Severe dehydration, Observation required"
                value={admissionReason}
                onChange={(e) => setAdmissionReason(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setAdmitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingAdmit || availableBeds.length === 0}>
                {savingAdmit ? 'Admitting...' : 'Confirm Admission'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Care Note & Vitals Modal */}
      {noteModalOpen && activeAdmission && (
        <Modal
          isOpen={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          title={`Clinical Care Note • ${activeAdmission.patientId?.name}`}
          maxWidth="520px"
        >
          <form onSubmit={handleAddCareNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
              <div>
                <label style={{ fontSize: '0.75rem' }}>BP</label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={vitals.bloodPressure}
                  onChange={(e) => setVitals({ ...vitals, bloodPressure: e.target.value })}
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Pulse</label>
                <input
                  type="number"
                  placeholder="76"
                  value={vitals.pulseRate}
                  onChange={(e) => setVitals({ ...vitals, pulseRate: e.target.value })}
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>Temp (°F)</label>
                <input
                  type="number"
                  placeholder="98.6"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem' }}>SpO2 (%)</label>
                <input
                  type="number"
                  placeholder="98"
                  value={vitals.spO2}
                  onChange={(e) => setVitals({ ...vitals, spO2: e.target.value })}
                  style={{ width: '100%', padding: '0.3rem', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Care Observation / Doctor Round Note:
              </label>
              <textarea
                required
                rows={3}
                placeholder="Patient resting comfortably, vitals stable, IV fluids administered..."
                value={careNoteText}
                onChange={(e) => setCareNoteText(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setNoteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Care Note
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Discharge Summary Modal */}
      {dischargeModalOpen && activeAdmission && (
        <Modal
          isOpen={dischargeModalOpen}
          onClose={() => setDischargeModalOpen(false)}
          title={`Discharge Patient • ${activeAdmission.patientId?.name}`}
          maxWidth="520px"
        >
          <form onSubmit={handleDischarge} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Condition at Discharge:
              </label>
              <input
                type="text"
                required
                value={conditionAtDischarge}
                onChange={(e) => setConditionAtDischarge(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                Discharge Advice / Recommendations:
              </label>
              <textarea
                rows={3}
                value={dischargeAdvice}
                onChange={(e) => setDischargeAdvice(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setDischargeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Discharge & Release Bed
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

