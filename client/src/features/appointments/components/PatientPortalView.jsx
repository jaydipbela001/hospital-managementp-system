import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { useAuth } from '../../../app/providers/AuthContext';
import { Modal, Button } from '../../../components/common';
import '../pages/AppointmentsPage.css';

export default function PatientPortalView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchDoctor, setSearchDoctor] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [appointmentFilter, setAppointmentFilter] = useState('UPCOMING'); // 'UPCOMING' | 'ALL'

  // Booking Modal / Drawer state
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookedToastMessage, setBookedToastMessage] = useState('');

  // Reschedule state
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [targetAppointment, setTargetAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, docRes, aptRes] = await Promise.all([
        apiClient('/departments').catch(() => ({ data: [] })),
        apiClient('/staff?role=DOCTOR').catch(() => ({ data: [] })),
        apiClient('/appointments').catch(() => ({ data: [] })),
      ]);
      setDepartments(deptRes.data || []);
      setDoctors(docRes.data || []);
      setMyAppointments(aptRes.data || []);
    } catch (err) {
      toast.error('Failed to load patient data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch slots for booking doctor
  useEffect(() => {
    if (!bookingDoctor || !bookingDate) {
      setSlots([]);
      return;
    }
    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlot(null);
        const res = await apiClient(`/appointments/slots?doctorId=${bookingDoctor._id}&date=${bookingDate}`);
        setSlots(res.data || []);
      } catch (err) {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [bookingDoctor, bookingDate]);

  // Fetch slots for reschedule
  useEffect(() => {
    if (!targetAppointment || !rescheduleDate) {
      setRescheduleSlots([]);
      return;
    }
    const loadRescheduleSlots = async () => {
      try {
        const docId = targetAppointment.doctorId?._id || targetAppointment.doctorId;
        const res = await apiClient(`/appointments/slots?doctorId=${docId}&date=${rescheduleDate}`);
        setRescheduleSlots(res.data || []);
      } catch (err) {
        setRescheduleSlots([]);
      }
    };
    loadRescheduleSlots();
  }, [targetAppointment, rescheduleDate]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      toast.error('Please select an available time slot.');
      return;
    }

    try {
      setBookingSubmitting(true);
      await apiClient('/appointments', {
        method: 'POST',
        body: {
          doctorId: bookingDoctor._id,
          departmentId: bookingDoctor.departmentId?._id || bookingDoctor.departmentId,
          startAt: selectedSlot.startAt,
          endAt: selectedSlot.endAt,
          reason: 'General consultation',
          appointmentType: 'FIRST_VISIT',
        },
      });

      const dateDisplay = new Date(selectedSlot.startAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeDisplay = new Date(selectedSlot.startAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      setBookedToastMessage(`Booked for ${dateDisplay}, ${timeDisplay}`);
      setTimeout(() => setBookedToastMessage(''), 4500);

      setBookingDoctor(null);
      setSelectedSlot(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment visit?')) return;

    try {
      await apiClient(`/appointments/${aptId}/status`, {
        method: 'PATCH',
        body: {
          status: 'CANCELLED',
          cancelReason: 'Cancelled by patient',
        },
      });
      toast.success('Appointment cancelled.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel appointment.');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedRescheduleSlot) {
      toast.error('Please choose a new time slot.');
      return;
    }

    try {
      setRescheduling(true);
      await apiClient(`/appointments/${targetAppointment._id}/reschedule`, {
        method: 'POST',
        body: {
          startAt: selectedRescheduleSlot.startAt,
          endAt: selectedRescheduleSlot.endAt,
          reason: 'Patient requested reschedule',
        },
      });
      toast.success('Appointment rescheduled successfully.');
      setRescheduleModal(false);
      setTargetAppointment(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduling(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesDept =
      selectedDept === 'ALL' ||
      doc.departmentId?._id === selectedDept ||
      doc.departmentId === selectedDept;
    const matchesSearch =
      doc.name.toLowerCase().includes(searchDoctor.toLowerCase()) ||
      (doc.doctorProfile?.specialization || '').toLowerCase().includes(searchDoctor.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const now = new Date();
  const upcomingAppointments = myAppointments.filter(
    (apt) => ['CONFIRMED', 'CHECKED_IN'].includes(apt.status) && new Date(apt.startAt) >= now
  );
  const cancelledAppointments = myAppointments.filter((apt) => apt.status === 'CANCELLED');

  const displayedAppointments =
    appointmentFilter === 'UPCOMING'
      ? upcomingAppointments
      : myAppointments;

  // Next upcoming visit
  const nextVisit = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Patient';

  return (
    <div className="patient-portal-page-v2">
      {/* Dark Emerald Greeting Banner */}
      <div className="emerald-hero-banner">
        <div className="hero-text-block">
          <h1 className="hero-greeting-title">Good morning, {firstName}</h1>
          <p className="hero-greeting-sub">
            Find a specialist, pick a free slot and keep track of every visit here.
          </p>
        </div>

        {nextVisit && (
          <div className="next-visit-gold-card">
            <span className="next-visit-label">Your next visit</span>
            <div className="next-visit-doc-name">
              Dr. {nextVisit.doctorId?.name?.replace('Dr. ', '') || 'Clinician'}
            </div>
            <div className="next-visit-datetime">
              {new Date(nextVisit.startAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              ·{' '}
              {new Date(nextVisit.startAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="portal-metrics-row">
        <div className="portal-metric-card">
          <span className="metric-number">{myAppointments.length}</span>
          <span className="metric-label">Total visits</span>
        </div>
        <div className="portal-metric-card">
          <span className="metric-number">{upcomingAppointments.length}</span>
          <span className="metric-label">Upcoming</span>
        </div>
        <div className="portal-metric-card">
          <span className="metric-number">{cancelledAppointments.length}</span>
          <span className="metric-label">Cancelled</span>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="portal-two-column-layout">
        {/* Left Column: Book a visit */}
        <div className="portal-white-panel">
          <h2 className="panel-heading">Book a visit</h2>
          <p className="panel-subheading">Search by doctor name or specialty, then choose a time.</p>

          {/* Search and Dept Filter */}
          <div className="filter-input-row">
            <input
              type="text"
              placeholder="Search doctors"
              value={searchDoctor}
              onChange={(e) => setSearchDoctor(e.target.value)}
              className="doc-search-field"
            />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="doc-dept-field"
            >
              <option value="ALL">All departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor List */}
          <div className="portal-doctor-list">
            {filteredDoctors.length === 0 ? (
              <div className="no-docs-text">No doctors available matching your search.</div>
            ) : (
              filteredDoctors.map((doc) => {
                const initial = doc.name.replace('Dr. ', '').charAt(0).toUpperCase();
                const spec = doc.doctorProfile?.specialization || 'Consultant physician';
                const deptName = doc.departmentId?.name || 'General OPD';
                const fee = doc.doctorProfile?.consultationFee;
                const isBooking = bookingDoctor?._id === doc._id;

                return (
                  <div key={doc._id} className="portal-doctor-row-item">
                    <div className="doc-avatar-initial">{initial}</div>
                    <div className="doc-info-block">
                      <div className="doc-full-name">{doc.name}</div>
                      <div className="doc-details-meta">
                        {spec} · {deptName} · 5+ yrs
                      </div>
                      <div className="doc-fee-line">
                        {fee ? `₹${fee}` : 'Free consultation'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn-book-action ${isBooking ? 'active' : ''}`}
                      onClick={() => setBookingDoctor(isBooking ? null : doc)}
                    >
                      {isBooking ? 'Selected' : 'Book'}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Inline Slot Picker when a Doctor is Clicked */}
          {bookingDoctor && (
            <div className="inline-slot-picker-drawer">
              <div className="drawer-top-row">
                <span className="drawer-title-text">
                  Choose time for {bookingDoctor.name}
                </span>
                <button
                  type="button"
                  className="drawer-close-link"
                  onClick={() => setBookingDoctor(null)}
                >
                  ✕
                </button>
              </div>

              <div className="drawer-date-input-wrap">
                <label className="drawer-input-label">Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="drawer-date-field"
                />
              </div>

              <div className="drawer-slots-container">
                <label className="drawer-input-label">Available Slots</label>
                {loadingSlots ? (
                  <div className="slots-loading-text">Loading open schedule slots...</div>
                ) : slots.length === 0 ? (
                  <div className="no-slots-alert">No bookable slots on this date.</div>
                ) : (
                  <div className="drawer-slots-pill-grid">
                    {slots.map((s, idx) => {
                      const isSelected = selectedSlot?.startAt === s.startAt;
                      const timeStr = new Date(s.startAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      });
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!s.isAvailable}
                          onClick={() => setSelectedSlot(s)}
                          className={`slot-chip-button ${isSelected ? 'selected' : ''} ${!s.isAvailable ? 'booked' : ''}`}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="drawer-action-row">
                <button
                  type="button"
                  className="btn-confirm-visit-teal"
                  disabled={bookingSubmitting || !selectedSlot}
                  onClick={handleConfirmBooking}
                >
                  {bookingSubmitting ? 'Confirming...' : 'Confirm visit booking'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: My Appointments */}
        <div className="portal-white-panel">
          <h2 className="panel-heading">My appointments</h2>
          <p className="panel-subheading">Live status of your consultations.</p>

          {/* Tab Filter: Upcoming vs All */}
          <div className="appointment-toggle-bar">
            <button
              type="button"
              className={`apt-toggle-btn ${appointmentFilter === 'UPCOMING' ? 'active' : ''}`}
              onClick={() => setAppointmentFilter('UPCOMING')}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`apt-toggle-btn ${appointmentFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setAppointmentFilter('ALL')}
            >
              All
            </button>
          </div>

          {/* List of Visits */}
          <div className="portal-visits-list">
            {displayedAppointments.length === 0 ? (
              <div className="no-appointments-box">
                <p>No {appointmentFilter.toLowerCase()} appointments.</p>
              </div>
            ) : (
              displayedAppointments.map((apt) => {
                const dateStr = new Date(apt.startAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const timeStr = new Date(apt.startAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                });
                const canModify = ['CONFIRMED', 'PENDING'].includes(apt.status);
                const feeVal = apt.consultationFee ? `₹${apt.consultationFee}` : 'Free';

                return (
                  <div key={apt._id} className="visit-card-item">
                    <div className="visit-card-top-row">
                      <span className="visit-apt-code">{apt.appointmentCode}</span>
                      <span className={`visit-status-tag ${apt.status.toLowerCase()}`}>
                        {apt.status === 'CONFIRMED' ? 'Confirmed' : apt.status}
                      </span>
                    </div>

                    <div className="visit-doc-name">
                      Dr. {apt.doctorId?.name?.replace('Dr. ', '') || 'Clinician'}
                    </div>
                    <div className="visit-dept-text">
                      {apt.departmentId?.name || 'Cardiology'}
                    </div>

                    <div className="visit-time-fee-bar">
                      <span className="visit-datetime-str">
                        {dateStr} · {timeStr}
                      </span>
                      <span className="visit-fee-str">{feeVal}</span>
                    </div>

                    {canModify && (
                      <div className="visit-actions-footer">
                        <button
                          type="button"
                          className="btn-action-reschedule"
                          onClick={() => {
                            setTargetAppointment(apt);
                            setRescheduleDate(new Date(apt.startAt).toISOString().split('T')[0]);
                            setRescheduleModal(true);
                          }}
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="btn-action-cancel"
                          onClick={() => handleCancelAppointment(apt._id)}
                        >
                          Cancel visit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Black Pill Toast in the Bottom Center */}
      {bookedToastMessage && (
        <div className="bottom-black-toast-pill">
          {bookedToastMessage}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && targetAppointment && (
        <Modal
          isOpen={rescheduleModal}
          onClose={() => setRescheduleModal(false)}
          title={`Reschedule Visit (${targetAppointment.appointmentCode})`}
        >
          <div className="reschedule-modal-content">
            <div style={{ marginBottom: '1rem' }}>
              <label className="drawer-input-label">Select New Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="drawer-date-field"
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="drawer-input-label">Available Time Slots</label>
              {rescheduleSlots.length === 0 ? (
                <div className="no-slots-alert">No available slots on this date.</div>
              ) : (
                <div className="drawer-slots-pill-grid">
                  {rescheduleSlots.map((s, idx) => {
                    const isSelected = selectedRescheduleSlot?.startAt === s.startAt;
                    const timeStr = new Date(s.startAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedRescheduleSlot(s)}
                        className={`slot-chip-button ${isSelected ? 'selected' : ''} ${!s.isAvailable ? 'booked' : ''}`}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="neutral" onClick={() => setRescheduleModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={rescheduling || !selectedRescheduleSlot}
                onClick={handleConfirmReschedule}
              >
                {rescheduling ? 'Saving...' : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
