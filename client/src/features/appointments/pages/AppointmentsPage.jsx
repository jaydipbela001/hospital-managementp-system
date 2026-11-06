import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Button, Modal, Loader, CustomSelect, Badge } from '../../../components/common';
import './AppointmentsPage.css';

// Formats a date into 12-hour format with AM / PM (e.g. 09:30 AM)
const formatTime12Hour = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const DAYS_OF_WEEK = [
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
  { day: 0, name: 'Sunday' },
];

export default function AppointmentsPage() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const location = useLocation();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Doctor Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [weeklyAvailability, setWeeklyAvailability] = useState([]);
  const [slotDuration, setSlotDuration] = useState(30);

  // Doctor Consultation Note Modal
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');

  // Patient Quick History Modal
  const [patientHistoryModal, setPatientHistoryModal] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // Lists for dropdowns
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);

  // Booking form state
  const [selectedPatientId, setSelectedPatientId] = useState(
    location.state?.preselectedPatientId || ''
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState(isDoctor ? (user?.id || user?._id) : '');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [reason, setReason] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const fetchDoctorSchedule = async () => {
    try {
      const res = await apiClient('/appointments/schedule');
      if (res?.data) {
        setWeeklyAvailability(res.data.weeklyAvailability || []);
        setSlotDuration(res.data.slotDurationMinutes || 30);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDropdownData();
    if (isDoctor) {
      fetchDoctorSchedule();
    }
    if (location.state?.preselectedPatientId) {
      setModalOpen(true);
    }
  }, [location.state, isDoctor]);

  // Fetch slots whenever doctor or date changes
  useEffect(() => {
    const docId = selectedDoctorId || (isDoctor ? (user?.id || user?._id) : '');
    if (!docId || !appointmentDate) {
      setSlots([]);
      setSelectedSlots([]);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        const res = await apiClient(
          `/appointments/slots?doctorId=${docId}&date=${appointmentDate}`
        );
        setSlots(res?.data || []);
        setSelectedSlots([]);
      } catch (err) {
        console.error(err);
        setSlots([]);
        setSelectedSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, appointmentDate, isDoctor, user]);

  const handleToggleSlot = (startAt) => {
    setSelectedSlots((prev) => {
      if (prev.includes(startAt)) {
        return prev.filter((s) => s !== startAt);
      }
      return [...prev, startAt].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    });
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.warning('Please select a patient.');
      return;
    }
    const docId = selectedDoctorId || (isDoctor ? (user?.id || user?._id) : '');
    if (!docId) {
      toast.warning('Please select a doctor.');
      return;
    }
    if (selectedSlots.length === 0) {
      toast.warning('Please select at least one available consultation slot.');
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient('/appointments', {
        body: {
          patientId: selectedPatientId,
          doctorId: docId,
          slots: selectedSlots,
          reason,
        },
      });

      toast.success(res?.message || 'Appointment(s) booked successfully!');
      setModalOpen(false);
      setSelectedPatientId('');
      if (!isDoctor) setSelectedDoctorId('');
      setSelectedSlots([]);
      setReason('');
      fetchAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status, note = '') => {
    try {
      await apiClient(`/appointments/${id}/status`, {
        method: 'PATCH',
        body: { status, note },
      });
      toast.success(`Appointment marked as ${status.replace('_', ' ')}`);
      fetchAppointments();
      setConsultModalOpen(false);
      setActiveAppointment(null);
      setConsultationNotes('');
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSavingSchedule(true);
      await apiClient('/appointments/schedule', {
        method: 'PUT',
        body: {
          weeklyAvailability,
          slotDurationMinutes: parseInt(slotDuration, 10),
        },
      });
      toast.success('Your consultation hours & schedule have been saved!');
      setScheduleModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleDayAvailability = (dayOfWeek) => {
    const exists = weeklyAvailability.some((w) => w.dayOfWeek === dayOfWeek);
    if (exists) {
      setWeeklyAvailability(weeklyAvailability.filter((w) => w.dayOfWeek !== dayOfWeek));
    } else {
      setWeeklyAvailability([
        ...weeklyAvailability,
        { dayOfWeek, startTime: '09:00', endTime: '17:00' },
      ]);
    }
  };

  const updateDayTime = (dayOfWeek, field, val) => {
    setWeeklyAvailability(
      weeklyAvailability.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: val } : w))
    );
  };

  const patientOptions = patients.map((p) => ({
    value: p._id,
    label: p.name,
    subtext: `ID: ${p.patientCode} • Phone: ${p.phone}`,
  }));

  const doctorOptions = doctors.map((d) => ({
    value: d._id,
    label: `Dr. ${d.name}`,
    subtext: d.departmentId?.name ? `Dept: ${d.departmentId.name}` : 'General Consultation',
  }));

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    const patName = apt.patientId?.name?.toLowerCase() || '';
    const patCode = apt.patientId?.patientCode?.toLowerCase() || '';
    const docName = apt.doctorId?.name?.toLowerCase() || '';
    const code = apt.appointmentCode?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || patName.includes(q) || patCode.includes(q) || docName.includes(q) || code.includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="appointments-container">
      <PageHeader
        title={isDoctor ? `Dr. ${user?.name || ''} — Clinical Consultation Queue` : 'Appointment Scheduling'}
        subtitle={
          isDoctor
            ? 'Manage your patient encounters, start consultations, record diagnosis, and set working hours'
            : 'Manage doctor consultation queues, slot availability, and patient bookings'
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {isDoctor && (
              <Button variant="outline" onClick={() => setScheduleModalOpen(true)}>
                ⚙️ My Working Hours & Slots
              </Button>
            )}
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              + Book Appointment
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="appointments-filters-bar">
        <div className="search-input-wrapper">
          <svg className="filter-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search patient, doctor, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div className="status-pills-list">
          {['ALL', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`status-filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : filteredAppointments.length === 0 ? (
        <div className="empty-appointments-box">
          <p className="empty-text">No appointments found matching your criteria.</p>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Book an Appointment
          </Button>
        </div>
      ) : (
        <div className="appointments-table-card">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Appointment Code</th>
                <th>Patient Details</th>
                {!isDoctor && <th>Doctor</th>}
                <th>Department</th>
                <th>Schedule</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((a) => (
                <tr key={a._id}>
                  <td>
                    <span className="code-badge">{a.appointmentCode}</span>
                  </td>
                  <td>
                    <div
                      className="patient-cell-name"
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      title="Click to view patient medical profile"
                      onClick={() => {
                        setSelectedPatientHistory(a.patientId);
                        setPatientHistoryModal(true);
                      }}
                    >
                      {a.patientId?.name || 'Unknown'} 🔍
                    </div>
                    <div className="patient-cell-sub">
                      {a.patientId?.patientCode} • {a.patientId?.phone || 'No Phone'}
                    </div>
                  </td>
                  {!isDoctor && (
                    <td>
                      <div className="doc-cell-name">Dr. {a.doctorId?.name || '—'}</div>
                    </td>
                  )}
                  <td>{a.departmentId?.name || 'General'}</td>
                  <td>
                    <div className="schedule-date">
                      {new Date(a.startAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="schedule-time">
                      {formatTime12Hour(a.startAt)} – {formatTime12Hour(a.endAt)}
                    </div>
                  </td>
                  <td>
                    <span className={`status-tag status-${a.status?.toLowerCase()}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons-group">
                      {/* Check-in for Front Desk / Nurse */}
                      {a.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          className="btn-action checkin"
                          onClick={() => handleStatusChange(a._id, 'CHECKED_IN')}
                          title="Patient has arrived"
                        >
                          Check In
                        </button>
                      )}

                      {/* Doctor Clinical Actions */}
                      {isDoctor && a.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          className="btn-action start-consult"
                          onClick={() => handleStatusChange(a._id, 'IN_PROGRESS')}
                          style={{ background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe', fontWeight: 600 }}
                        >
                          🩺 Start Consult
                        </button>
                      )}

                      {isDoctor && a.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          className="btn-action complete"
                          onClick={() => {
                            setActiveAppointment(a);
                            setConsultModalOpen(true);
                          }}
                          style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac', fontWeight: 600 }}
                        >
                          ✓ Finish & Note
                        </button>
                      )}

                      {!isDoctor && a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="btn-action complete"
                          onClick={() => handleStatusChange(a._id, 'COMPLETED')}
                        >
                          Complete
                        </button>
                      )}

                      {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="btn-action cancel"
                          onClick={() => handleStatusChange(a._id, 'CANCELLED')}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Booking Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Book Doctor Appointment"
          maxWidth="580px"
        >
          <form onSubmit={handleBook} className="appointment-form-layout">
            <div className="form-section-card">
              <CustomSelect
                label="Select Patient"
                required
                options={patientOptions}
                value={selectedPatientId}
                onChange={(val) => setSelectedPatientId(val)}
                placeholder="Search or choose patient..."
              />
            </div>

            {!isDoctor && (
              <div className="form-section-card">
                <CustomSelect
                  label="Select Doctor"
                  required
                  options={doctorOptions}
                  value={selectedDoctorId}
                  onChange={(val) => {
                    setSelectedDoctorId(val);
                    setSelectedSlots([]);
                  }}
                  placeholder="Search or choose consulting doctor..."
                />
              </div>
            )}

            <div className="form-section-card">
              <label className="field-title">
                Consultation Date <span className="required-star">*</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={appointmentDate}
                onChange={(e) => {
                  setAppointmentDate(e.target.value);
                  setSelectedSlots([]);
                }}
                required
                className="date-picker-input"
              />
            </div>

            <div className="form-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="field-title" style={{ margin: 0 }}>
                  Available Time Slots (12-hour format) <span className="required-star">*</span>
                </label>
                {selectedSlots.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                    {selectedSlots.length} slot(s) selected
                  </span>
                )}
              </div>

              {!selectedDoctorId && !isDoctor ? (
                <div className="slots-empty-notice">
                  <span>ℹ️</span> Please select a doctor above to view their available consultation slots.
                </div>
              ) : loadingSlots ? (
                <div className="slots-loading-notice">
                  Fetching doctor's available slots...
                </div>
              ) : slots.length === 0 ? (
                <div className="slots-unavailable-notice">
                  No upcoming slots available on this date.
                </div>
              ) : (
                <div className="slots-grid-container">
                  {slots.map((s, idx) => {
                    const time12 = formatTime12Hour(s.startAt);
                    const isSelected = selectedSlots.includes(s.startAt);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => handleToggleSlot(s.startAt)}
                        className={`slot-pill-btn ${isSelected ? 'selected' : ''} ${!s.isAvailable ? 'disabled' : ''}`}
                      >
                        {time12}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-section-card">
              <label className="field-title">Reason for Visit (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Regular Checkup, Fever, Consultation"
                className="reason-text-input"
              />
            </div>

            <div className="modal-actions-footer">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving || selectedSlots.length === 0}>
                {saving ? 'Booking...' : selectedSlots.length > 1 ? `Confirm (${selectedSlots.length} Slots)` : 'Confirm Booking'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Doctor Schedule Configuration Modal */}
      {scheduleModalOpen && (
        <Modal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          title="Doctor Working Hours & Consultation Slots"
          maxWidth="640px"
        >
          <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface-muted)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Slot Duration (minutes):</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Weekly Working Days & Timings:
              </span>
              {DAYS_OF_WEEK.map(({ day, name }) => {
                const dayConfig = weeklyAvailability.find((w) => w.dayOfWeek === day);
                const isDayActive = !!dayConfig;
                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.75rem',
                      background: isDayActive ? '#ffffff' : 'var(--color-surface-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      opacity: isDayActive ? 1 : 0.6,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isDayActive}
                        onChange={() => toggleDayAvailability(day)}
                      />
                      {name}
                    </label>

                    {isDayActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span>From:</span>
                        <input
                          type="time"
                          value={dayConfig.startTime}
                          onChange={(e) => updateDayTime(day, 'startTime', e.target.value)}
                          style={{ padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                        <span>To:</span>
                        <input
                          type="time"
                          value={dayConfig.endTime}
                          onChange={(e) => updateDayTime(day, 'endTime', e.target.value)}
                          style={{ padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>Off Duty</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="modal-actions-footer">
              <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingSchedule}>
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Consultation Complete & Diagnosis Modal */}
      {consultModalOpen && activeAppointment && (
        <Modal
          isOpen={consultModalOpen}
          onClose={() => setConsultModalOpen(false)}
          title={`Finish Consultation • ${activeAppointment.appointmentCode}`}
          maxWidth="540px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)' }}>
              <strong>Patient:</strong> {activeAppointment.patientId?.name} ({activeAppointment.patientId?.patientCode})
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Reason for visit: {activeAppointment.reason || 'General evaluation'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Clinical Observation / Diagnosis Notes:
              </label>
              <textarea
                rows={4}
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                placeholder="Enter doctor's diagnosis, clinical notes, and recommendations..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div className="modal-actions-footer">
              <Button type="button" variant="outline" onClick={() => setConsultModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleStatusChange(activeAppointment._id, 'COMPLETED', consultationNotes)}
              >
                Mark Completed
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Patient Medical History Modal */}
      {patientHistoryModal && selectedPatientHistory && (
        <Modal
          isOpen={patientHistoryModal}
          onClose={() => setPatientHistoryModal(false)}
          title={`Medical Record: ${selectedPatientHistory.name} (${selectedPatientHistory.patientCode})`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--color-surface-muted)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <div><strong>Blood Group:</strong> {selectedPatientHistory.bloodGroup || 'Unknown'}</div>
              <div><strong>Gender:</strong> {selectedPatientHistory.gender || '—'}</div>
              <div><strong>Phone:</strong> {selectedPatientHistory.phone || '—'}</div>
              <div><strong>Email:</strong> {selectedPatientHistory.email || '—'}</div>
            </div>

            <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-danger)', marginBottom: '4px' }}>Allergies</div>
              <div>{selectedPatientHistory.allergies?.length > 0 ? selectedPatientHistory.allergies.join(', ') : 'No known allergies'}</div>
            </div>

            <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-primary-900)', marginBottom: '4px' }}>Medical History</div>
              <div>{selectedPatientHistory.medicalHistory || 'No significant medical history recorded.'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="primary" onClick={() => setPatientHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
