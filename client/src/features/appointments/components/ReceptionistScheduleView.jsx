import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { dataCache } from '../../../services/dataCache';
import { Badge, Button, Modal, Pagination } from '../../../components/common';
import '../pages/AppointmentsPage.css';

const formatTimeRange = (startAt, endAt) => {
  if (!startAt) return '';
  const sStr = new Date(startAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (!endAt) return sStr;
  const eStr = new Date(endAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${sStr} - ${eStr}`;
};

export default function ReceptionistScheduleView() {
  const initialDate = new Date().toISOString().split('T')[0];
  const cachedApts = dataCache.get(`appointments_${initialDate}`);
  const cachedDocs = dataCache.get('doctors_list');
  const cachedDepts = dataCache.get('departments_list');

  const [appointments, setAppointments] = useState(cachedApts || []);
  const [doctors, setDoctors] = useState(cachedDocs || []);
  const [departments, setDepartments] = useState(cachedDepts || []);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(!cachedApts);
  const [isFiltering, setIsFiltering] = useState(false);

  // Filter state
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [appliedDate, setAppliedDate] = useState(initialDate);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  // Booking Modal
  const [bookingModal, setBookingModal] = useState(false);
  const [modalPatientId, setModalPatientId] = useState('');
  const [modalDoctorId, setModalDoctorId] = useState('');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalSlots, setModalSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [modalReason, setModalReason] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);

  // Quick Patient Registration Modal
  const [patientModal, setPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('MALE');
  const [newPatientBlood, setNewPatientBlood] = useState('O+');
  const [savingPatient, setSavingPatient] = useState(false);

  // Doctor Schedule Config Modal (For Admin & Receptionist)
  const [scheduleModal, setScheduleModal] = useState(false);
  const [schedDoctorId, setSchedDoctorId] = useState('');
  const [slotDuration, setSlotDuration] = useState(20);
  const [weeklySchedule, setWeeklySchedule] = useState([
    { dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
    { dayOfWeek: 1, startTime: '17:00', endTime: '20:00' },
    { dayOfWeek: 2, startTime: '09:00', endTime: '13:00' },
    { dayOfWeek: 3, startTime: '17:00', endTime: '20:00' },
    { dayOfWeek: 4, startTime: '09:00', endTime: '13:00' },
    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
  ]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchRecords = async (isFilterChange = false) => {
    try {
      if (isFilterChange) {
        setIsFiltering(true);
      } else {
        setLoading(true);
      }
      const queryParams = new URLSearchParams();
      if (appliedDate) queryParams.set('date', appliedDate);
      if (selectedDoctorFilter !== 'ALL') queryParams.set('doctorId', selectedDoctorFilter);
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);

      const aptPromise = apiClient(`/appointments?${queryParams.toString()}`).catch(() => ({ data: [] }));

      // Use cached static data (Doctors & Departments) if valid for 5 minutes
      let cachedDocs = dataCache.getStatic('doctors_list');
      let cachedDepts = dataCache.getStatic('departments_list');

      const promises = [aptPromise];
      const fetchDocs = !cachedDocs;
      const fetchDepts = !cachedDepts;
      const fetchPats = patients.length === 0;

      if (fetchDocs) promises.push(apiClient('/staff?role=DOCTOR').catch(() => ({ data: [] })));
      if (fetchDepts) promises.push(apiClient('/departments').catch(() => ({ data: [] })));
      if (fetchPats) promises.push(apiClient('/patients?limit=100').catch(() => ({ data: [] })));

      const results = await Promise.all(promises);
      const aptRes = results[0];
      let pIdx = 1;

      if (fetchDocs) {
        cachedDocs = results[pIdx++]?.data || [];
        dataCache.set('doctors_list', cachedDocs);
      }
      if (fetchDepts) {
        cachedDepts = results[pIdx++]?.data || [];
        dataCache.set('departments_list', cachedDepts);
      }
      if (fetchPats) {
        const patRes = results[pIdx++]?.data || [];
        setPatients(patRes);
      }

      setAppointments(aptRes?.data || []);
      setDoctors(cachedDocs || []);
      setDepartments(cachedDepts || []);
    } catch (err) {
      toast.error('Failed to load appointments roster.');
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchRecords(appointments.length > 0);
  }, [appliedDate, selectedDoctorFilter, statusFilter]);

  // Fetch slots for booking modal
  useEffect(() => {
    if (!modalDoctorId || !modalDate) {
      setModalSlots([]);
      setSelectedSlots([]);
      return;
    }
    const loadSlots = async () => {
      try {
        setSelectedSlots([]);
        const patParam = modalPatientId ? `&patientId=${modalPatientId}` : '';
        const res = await apiClient(`/appointments/slots?doctorId=${modalDoctorId}&date=${modalDate}${patParam}&_t=${Date.now()}`);
        setModalSlots(res.data || []);
      } catch (e) {
        setModalSlots([]);
      }
    };
    loadSlots();
  }, [modalDoctorId, modalDate, modalPatientId]);

  const handleQuickRegisterPatient = async (e) => {
    e.preventDefault();
    try {
      setSavingPatient(true);
      const res = await apiClient('/patients', {
        method: 'POST',
        body: {
          name: newPatientName,
          phone: newPatientPhone,
          gender: newPatientGender,
          bloodGroup: newPatientBlood,
        },
      });
      toast.success('Patient registered successfully.');
      setPatients((prev) => [res.data, ...prev]);
      setModalPatientId(res.data._id);
      setPatientModal(false);
      setNewPatientName('');
      setNewPatientPhone('');
    } catch (err) {
      toast.error(err.message || 'Failed to register patient.');
    } finally {
      setSavingPatient(false);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!modalPatientId) {
      toast.error('Please select or register a patient.');
      return;
    }
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one available slot.');
      return;
    }

    try {
      setSavingBooking(true);
      const doc = doctors.find((d) => d._id === modalDoctorId);
      await apiClient('/appointments', {
        method: 'POST',
        body: {
          patientId: modalPatientId,
          doctorId: modalDoctorId,
          departmentId: doc?.departmentId?._id || doc?.departmentId,
          slots: selectedSlots.map((s) => s.startAt),
          reason: modalReason || 'General checkup',
          appointmentType: 'WALK_IN',
        },
      });
      toast.success(
        selectedSlots.length > 1
          ? `${selectedSlots.length} appointment slots booked successfully.`
          : 'Appointment created successfully.'
      );
      setBookingModal(false);
      setSelectedSlots([]);
      setModalReason('');
      fetchRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to create appointment.');
    } finally {
      setSavingBooking(false);
    }
  };

  const handleQuickStatusChange = async (aptId, newStatus) => {
    try {
      await apiClient(`/appointments/${aptId}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchRecords();
    } catch (err) {
      toast.error(err.message || 'Status update failed.');
    }
  };

  const handleSaveScheduleConfig = async (e) => {
    e.preventDefault();
    if (!schedDoctorId) {
      toast.error('Please select a doctor to configure.');
      return;
    }

    try {
      setSavingSchedule(true);
      await apiClient('/appointments/schedule', {
        method: 'PUT',
        body: {
          doctorId: schedDoctorId,
          slotDurationMinutes: Number(slotDuration),
          weeklyAvailability: weeklySchedule,
        },
      });
      toast.success('Doctor schedule configuration saved.');
      setScheduleModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'CHECKED_IN': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'neutral';
      case 'CANCELLED': return 'danger';
      default: return 'success';
    }
  };

  const totalPages = Math.ceil(appointments.length / limit) || 1;
  const paginatedAppointments = appointments.slice((page - 1) * limit, page * limit);

  return (
    <div className="receptionist-schedule-container">
      {/* Top Action & Roster Bar */}
      <div className="reception-header-bar">
        <div>
          <span className="role-kicker">Reception &amp; Hospital Administration</span>
          <h2 className="reception-title">Appointment Master Schedule</h2>
          <p className="reception-sub">
            Hospital-wide appointment management, walk-in registration, check-in triage, and doctor shift configuration.
          </p>
        </div>
        <div className="header-actions reception-header-actions">
          <Button variant="neutral" onClick={() => setScheduleModal(true)}>
            ⚙ Config Doctor Shift
          </Button>
          <Button variant="primary" onClick={() => setBookingModal(true)}>
            + Book Appointment
          </Button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="reception-filter-ribbon">
        <div className="ribbon-field ribbon-field-date">
          <label>Schedule Date:</label>
          <div className="date-input-group">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="field-input-sm"
            />
            <button
              type="button"
              className="btn-apply-date"
              disabled={dateFilter === appliedDate}
              onClick={() => setAppliedDate(dateFilter)}
              title="Apply Date Filter"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="ribbon-field">
          <label>Attending Doctor:</label>
          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            className="field-input-sm"
          >
            <option value="ALL">All Doctors</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.doctorProfile?.specialization || 'Physician'})
              </option>
            ))}
          </select>
        </div>

        <div className="ribbon-field">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-input-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="ribbon-stats-badge">
          Showing <strong>{appointments.length}</strong> patient bookings
          {isFiltering && <span className="filtering-pulse-dot" title="Refreshing live bookings..."></span>}
        </div>
      </div>

      {/* Roster Table */}
      <div className={`reception-table-card ${isFiltering ? 'filtering' : ''}`}>
        {isFiltering && (
          <div className="table-filter-progress-bar">
            <div className="filter-progress-indeterminate"></div>
          </div>
        )}
        {loading ? (
          <div className="doc-table-loader">Loading appointments schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="doc-empty-state">
            <p>No appointments match the selected filters.</p>
            <span>Click "+ Book Appointment" to schedule a walk-in patient.</span>
          </div>
        ) : (
          <div className="reception-table-wrap">
            <table className="reception-queue-table">
              <thead>
                <tr>
                  <th>Code &amp; Time</th>
                  <th>Patient Details</th>
                  <th>Assigned Doctor</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Front Desk Actions</th>
                </tr>
              </thead>
              <tbody className="fade-in-rows">
                {paginatedAppointments.map((apt) => {
                  const time12 = formatTimeRange(apt.startAt, apt.endAt);
                  const pat = apt.patientId || {};
                  const doc = apt.doctorId || {};

                  return (
                    <tr key={apt._id} className="smooth-table-row">
                      <td>
                        <div className="apt-table-code">{apt.appointmentCode}</div>
                        <div className="apt-table-time">{time12}</div>
                      </td>
                      <td>
                        <div className="pat-table-name">{pat.name || 'Patient'}</div>
                        <div className="pat-table-phone">{pat.phone} • {pat.patientCode}</div>
                      </td>
                      <td>
                        <div className="doc-table-name">{doc.name}</div>
                      </td>
                      <td>
                        <span className="dept-pill">{apt.departmentId?.name || 'OPD'}</span>
                      </td>
                      <td>
                        <Badge variant={getStatusVariant(apt.status)}>{apt.status}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="reception-action-btns">
                          {apt.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              className="btn-reception-checkin"
                              onClick={() => handleQuickStatusChange(apt._id, 'CHECKED_IN')}
                            >
                              Check In
                            </button>
                          )}
                          {['CONFIRMED', 'CHECKED_IN'].includes(apt.status) && (
                            <button
                              type="button"
                              className="btn-reception-cancel"
                              onClick={() => handleQuickStatusChange(apt._id, 'CANCELLED')}
                            >
                              Cancel
                            </button>
                          )}
                          {apt.status === 'CANCELLED' && (
                            <span className="cancelled-note-chip">Cancelled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="reception-table-spacer"></div>
          </div>
        )}

        {appointments.length > 0 && (
          <div className="reception-pagination-wrap">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={appointments.length}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              itemName="appointments"
            />
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      {bookingModal && (
        <Modal
          isOpen={bookingModal}
          onClose={() => setBookingModal(false)}
          title="Create Patient Appointment (Receptionist)"
          size="large"
        >
          <form onSubmit={handleCreateAppointment} className="modal-booking-form">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="field-label">Select Patient *</label>
              <button
                type="button"
                className="btn-link-register"
                onClick={() => setPatientModal(true)}
              >
                + Register New Walk-in Patient
              </button>
            </div>
            <select
              required
              value={modalPatientId}
              onChange={(e) => setModalPatientId(e.target.value)}
              className="field-input"
              style={{ marginBottom: '1rem' }}
            >
              <option value="">-- Choose Patient --</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.patientCode} - {p.phone})
                </option>
              ))}
            </select>

            <div className="form-row-grid">
              <div className="form-field">
                <label className="field-label">Select Doctor *</label>
                <select
                  required
                  value={modalDoctorId}
                  onChange={(e) => setModalDoctorId(e.target.value)}
                  className="field-input"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.departmentId?.name || 'OPD'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">Appointment Date *</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                  className="field-input"
                />
              </div>
            </div>

            <div className="slot-selection-section" style={{ margin: '1rem 0' }}>
              <label className="field-label">
                Available Slots {selectedSlots.length > 0 && <span style={{ color: '#047857', fontWeight: 600 }}>({selectedSlots.length} selected)</span>}
              </label>
              {modalSlots.length === 0 ? (
                <div className="no-slots-alert">No available slots for selected doctor on this date.</div>
              ) : (
                <div className="slots-pill-group">
                  {modalSlots.map((s, idx) => {
                    const isChosen = selectedSlots.some((slot) => slot.startAt === s.startAt);
                    const timeStr = formatTimeRange(s.startAt, s.endAt);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!s.isAvailable}
                        title={!s.isAvailable ? (s.conflictReason || 'Already booked') : `Slot: ${timeStr}`}
                        onClick={() => {
                          setSelectedSlots((prev) => {
                            if (prev.some((slot) => slot.startAt === s.startAt)) {
                              return prev.filter((slot) => slot.startAt !== s.startAt);
                            }
                            return [...prev, s];
                          });
                        }}
                        className={`slot-btn-pill ${isChosen ? 'chosen' : ''} ${!s.isAvailable ? 'disabled' : ''}`}
                      >
                        {timeStr} {isChosen ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-field" style={{ marginBottom: '1.25rem' }}>
              <label className="field-label">Visit Reason</label>
              <input
                type="text"
                placeholder="e.g. Walk-in chest pain, viral fever"
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                className="field-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="neutral" onClick={() => setBookingModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingBooking || selectedSlots.length === 0}>
                {savingBooking
                  ? 'Booking...'
                  : selectedSlots.length > 1
                  ? `Confirm ${selectedSlots.length} Slots Booking`
                  : 'Confirm Walk-in Booking'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Register Patient Modal */}
      {patientModal && (
        <Modal
          isOpen={patientModal}
          onClose={() => setPatientModal(false)}
          title="Quick Register Walk-in Patient"
        >
          <form onSubmit={handleQuickRegisterPatient}>
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label className="field-label">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="field-input"
              />
            </div>
            <div className="form-field" style={{ marginBottom: '0.75rem' }}>
              <label className="field-label">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={newPatientPhone}
                onChange={(e) => setNewPatientPhone(e.target.value)}
                className="field-input"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
              <div className="form-field">
                <label className="field-label">Gender</label>
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value)}
                  className="field-input"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Blood Group</label>
                <select
                  value={newPatientBlood}
                  onChange={(e) => setNewPatientBlood(e.target.value)}
                  className="field-input"
                >
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="O+">O+</option>
                  <option value="AB+">AB+</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="neutral" onClick={() => setPatientModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingPatient}>
                {savingPatient ? 'Saving...' : 'Register Patient'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Doctor Schedule Shift Config Modal */}
      {scheduleModal && (
        <Modal
          isOpen={scheduleModal}
          onClose={() => setScheduleModal(false)}
          title="Configure Doctor Shifts &amp; Slot Duration"
          size="large"
        >
          <form onSubmit={handleSaveScheduleConfig}>
            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label className="field-label">Doctor to Configure *</label>
              <select
                required
                value={schedDoctorId}
                onChange={(e) => setSchedDoctorId(e.target.value)}
                className="field-input"
              >
                <option value="">-- Choose Doctor --</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.departmentId?.name || 'OPD'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field" style={{ marginBottom: '1rem' }}>
              <label className="field-label">Appointment Slot Duration (Minutes)</label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(e.target.value)}
                className="field-input"
              >
                <option value={15}>15 Minutes (Express Consult)</option>
                <option value={20}>20 Minutes (Standard Clinic)</option>
                <option value={30}>30 Minutes (Comprehensive)</option>
                <option value={45}>45 Minutes (Specialty / Surgery Review)</option>
              </select>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Configured shift intervals (Morning 09:00 - 13:00, Evening 17:00 - 20:00). Bookable slots will be dynamically generated according to this schedule.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="neutral" onClick={() => setScheduleModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={savingSchedule}>
                {savingSchedule ? 'Saving Schedule...' : 'Save Shift Schedule'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
