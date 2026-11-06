import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { PageHeader, Button, Input, Modal, Loader } from '../../../components/common';

export default function AppointmentsPage() {
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lists for dropdowns
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  // Booking form state
  const [selectedPatientId, setSelectedPatientId] = useState(
    location.state?.preselectedPatientId || ''
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/appointments');
      setAppointments(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [docRes, patRes] = await Promise.all([
        apiClient('/staff?role=DOCTOR').catch(() => ({ data: [] })),
        apiClient('/patients').catch(() => ({ data: [] })),
      ]);
      setDoctors(docRes?.data || []);
      setPatients(patRes?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDropdownData();
    if (location.state?.preselectedPatientId) {
      setModalOpen(true);
    }
  }, [location.state]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    if (!selectedDoctorId || !appointmentDate) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const res = await apiClient(
          `/appointments/slots?doctorId=${selectedDoctorId}&date=${appointmentDate}`
        );
        setSlots(res?.data || []);
      } catch (err) {
        console.error(err);
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.warning('Please select an available consultation slot.');
      return;
    }

    try {
      setSaving(true);
      await apiClient('/appointments', {
        body: {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          startAt: selectedSlot,
          reason,
        },
      });

      toast.success('Appointment booked successfully!');
      setModalOpen(false);
      setSelectedPatientId('');
      setSelectedDoctorId('');
      setSelectedSlot('');
      setReason('');
      fetchAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiClient(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      toast.success(`Appointment marked as ${status}`);
      fetchAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Appointment Scheduling"
        subtitle="Manage doctor consultation queues, slot availability, and patient bookings"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Book Appointment
          </Button>
        }
      />

      {loading ? (
        <Loader />
      ) : appointments.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: '1.5rem' }}>
          No scheduled appointments found. Click "Book Appointment" to schedule one.
        </p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Patient</th>
                <th style={{ padding: '0.75rem 1rem' }}>Doctor</th>
                <th style={{ padding: '0.75rem 1rem' }}>Department</th>
                <th style={{ padding: '0.75rem 1rem' }}>Schedule Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4f46e5' }}>
                    {a.appointmentCode}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.patientId?.name || '—'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{a.patientId?.patientCode}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: 500 }}>
                    Dr. {a.doctorId?.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                    {a.departmentId?.name || 'General'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>
                    {new Date(a.startAt).toLocaleDateString()}{' '}
                    <strong>
                      {new Date(a.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          a.status === 'CONFIRMED'
                            ? '#dbeafe'
                            : a.status === 'COMPLETED'
                            ? '#dcfce7'
                            : a.status === 'CANCELLED'
                            ? '#fee2e2'
                            : '#f1f5f9',
                        color:
                          a.status === 'CONFIRMED'
                            ? '#1e40af'
                            : a.status === 'COMPLETED'
                            ? '#15803d'
                            : a.status === 'CANCELLED'
                            ? '#b91c1c'
                            : '#475569',
                      }}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(a._id, 'COMPLETED')}
                        >
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(a._id, 'CANCELLED')}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Modal */}
      {modalOpen && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Book Doctor Appointment">
          <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: '380px' }}>
            
            {/* Step 1: Patient Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                1. Select Patient *
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} [{p.patientCode}] - {p.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Doctor Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                2. Select Doctor *
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setSelectedSlot('');
                }}
                required
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    Dr. {d.name} {d.departmentId?.name ? `(${d.departmentId.name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                3. Consultation Date *
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedSlot('');
                }}
                required
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            {/* Step 4: Time Slot selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                4. Available Time Slots *
              </label>
              {!selectedDoctorId ? (
                <p style={{ margin: 0, padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                  Please select a doctor to view their schedule slots.
                </p>
              ) : loadingSlots ? (
                <p style={{ margin: 0, padding: '0.75rem', color: '#4f46e5', fontSize: '0.85rem' }}>
                  Fetching available slots...
                </p>
              ) : slots.length === 0 ? (
                <p style={{ margin: 0, padding: '0.75rem', background: '#fee2e2', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
                  Doctor is off duty or has no available slots for this date.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.25rem' }}>
                  {slots.map((s, idx) => {
                    const timeStr = new Date(s.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isSelected = selectedSlot === s.startAt;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedSlot(s.startAt)}
                        style={{
                          padding: '0.5rem 0.25rem',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: !s.isAvailable ? '#f1f5f9' : isSelected ? '#4f46e5' : '#fff',
                          color: !s.isAvailable ? '#94a3b8' : isSelected ? '#fff' : '#1e293b',
                          cursor: !s.isAvailable ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 5: Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' }}>
                5. Reason for Visit (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Chest pain, Routine checkup, Fever"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving || !selectedSlot}>
                {saving ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

