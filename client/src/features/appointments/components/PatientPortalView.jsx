import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { dataCache } from '../../../services/dataCache';
import { useAuth } from '../../../app/providers/AuthContext';
import { Modal, Button, Pagination, ConfirmDialog } from '../../../components/common';
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

export default function PatientPortalView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') || 'dashboard').toLowerCase();
  const showBook = currentTab === 'dashboard' || currentTab === 'book';
  const showAppointments = currentTab === 'dashboard' || currentTab === 'my';

  const cachedDepts = dataCache.getStatic('departments_list');
  const cachedDocs = dataCache.getStatic('doctors_list');
  const cachedApts = dataCache.get('patient_appointments');

  const [departments, setDepartments] = useState(cachedDepts || []);
  const [doctors, setDoctors] = useState(cachedDocs || []);
  const [myAppointments, setMyAppointments] = useState(cachedApts || []);
  const [loading, setLoading] = useState(!cachedApts && !cachedDocs);

  // Filters & State
  const [searchDoctor, setSearchDoctor] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef(null);
  const [appointmentFilter, setAppointmentFilter] = useState('UPCOMING'); // 'UPCOMING' | 'CANCELLED' | 'ALL'
  const [searchAptDoctor, setSearchAptDoctor] = useState('');

  // Pagination states
  const [docPage, setDocPage] = useState(1);
  const docLimit = 5;
  const [aptPage, setAptPage] = useState(1);
  const aptLimit = 4;

  // Booking Modal / Popup state
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Reschedule state
  const [rescheduleModal, setRescheduleModal] = useState(false);
  const [targetAppointment, setTargetAppointment] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [selectedRescheduleSlots, setSelectedRescheduleSlots] = useState([]);
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel Confirmation state
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    try {
      const hasInitialCache = dataCache.getStatic('doctors_list') || dataCache.get('patient_appointments');
      if (!hasInitialCache) setLoading(true);

      const cachedDeptsLocal = dataCache.getStatic('departments_list');
      const cachedDocsLocal = dataCache.getStatic('doctors_list');

      const promises = [
        cachedDeptsLocal ? Promise.resolve({ data: cachedDeptsLocal }) : apiClient('/departments').catch(() => ({ data: [] })),
        cachedDocsLocal ? Promise.resolve({ data: cachedDocsLocal }) : apiClient('/staff?role=DOCTOR').catch(() => ({ data: [] })),
        apiClient('/appointments').catch(() => ({ data: [] })),
      ];

      const [deptRes, docRes, aptRes] = await Promise.all(promises);

      const deptData = deptRes.data || [];
      const docData = docRes.data || [];
      const aptData = aptRes.data || [];

      setDepartments(deptData);
      setDoctors(docData);
      setMyAppointments(aptData);

      dataCache.set('departments_list', deptData);
      dataCache.set('doctors_list', docData);
      dataCache.set('patient_appointments', aptData);
    } catch (err) {
      toast.error('Failed to load patient data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  // Click outside listener for department dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when doctor booking popup is open
  useEffect(() => {
    if (bookingDoctor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [bookingDoctor]);

  // Fetch slots for booking doctor
  useEffect(() => {
    if (!bookingDoctor || !bookingDate) {
      setSlots([]);
      return;
    }
    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlots([]);
        const res = await apiClient(`/appointments/slots?doctorId=${bookingDoctor._id}&date=${bookingDate}&_t=${Date.now()}`);
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
      setSelectedRescheduleSlots([]);
      return;
    }
    const loadRescheduleSlots = async () => {
      try {
        setSelectedRescheduleSlots([]);
        const docId = targetAppointment.doctorId?._id || targetAppointment.doctorId;
        const res = await apiClient(`/appointments/slots?doctorId=${docId}&date=${rescheduleDate}&_t=${Date.now()}`);
        setRescheduleSlots(res.data || []);
      } catch (err) {
        setRescheduleSlots([]);
      }
    };
    loadRescheduleSlots();
  }, [targetAppointment, rescheduleDate]);

  const handleToggleSlot = (slot) => {
    if (!slot.isAvailable) return;
    const timeIso = slot.startAt;
    setSelectedSlots((prev) => {
      if (prev.includes(timeIso)) {
        return prev.filter((t) => t !== timeIso);
      }
      return [...prev, timeIso].sort();
    });
  };

  const handleConfirmBooking = async () => {
    if (selectedSlots.length === 0) {
      toast.error('Please select at least one available time slot.');
      return;
    }

    try {
      setBookingSubmitting(true);
      const slotObjects = selectedSlots.map((timeIso) => {
        const found = slots.find((s) => s.startAt === timeIso);
        return found ? { startAt: found.startAt, endAt: found.endAt } : { startAt: timeIso };
      });

      await apiClient('/appointments', {
        method: 'POST',
        body: {
          doctorId: bookingDoctor._id,
          departmentId: bookingDoctor.departmentId?._id || bookingDoctor.departmentId,
          slots: slotObjects,
          reason: 'General consultation',
          appointmentType: 'FIRST_VISIT',
        },
      });

      const firstTime = new Date(selectedSlots[0]).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      toast.success(
        selectedSlots.length > 1
          ? `Successfully booked ${selectedSlots.length} visit slots starting at ${firstTime}!`
          : `Successfully booked visit for ${firstTime}!`
      );

      setBookingDoctor(null);
      setSelectedSlots([]);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to book appointment.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelTargetId) return;
    try {
      setCancelling(true);
      await apiClient(`/appointments/${cancelTargetId}/status`, {
        method: 'PATCH',
        body: {
          status: 'CANCELLED',
          cancelReason: 'Cancelled by patient',
        },
      });
      toast.success('Appointment cancelled successfully.');
      setCancelTargetId(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  };

  const handleToggleRescheduleSlot = (slot) => {
    if (!slot.isAvailable) return;
    const timeIso = slot.startAt;
    setSelectedRescheduleSlots((prev) => {
      if (prev.includes(timeIso)) {
        return prev.filter((t) => t !== timeIso);
      }
      return [...prev, timeIso].sort();
    });
  };

  const handleConfirmReschedule = async () => {
    if (selectedRescheduleSlots.length === 0) {
      toast.error('Please choose at least one time slot.');
      return;
    }

    try {
      setRescheduling(true);
      const slotObjects = selectedRescheduleSlots.map((timeIso) => {
        const found = rescheduleSlots.find((s) => s.startAt === timeIso);
        return found ? { startAt: found.startAt, endAt: found.endAt } : { startAt: timeIso };
      });

      await apiClient(`/appointments/${targetAppointment._id}/reschedule`, {
        method: 'POST',
        body: {
          slots: slotObjects,
          reason: 'Patient requested reschedule',
        },
      });
      toast.success(
        selectedRescheduleSlots.length > 1
          ? `Appointment rescheduled to ${selectedRescheduleSlots.length} slots successfully.`
          : 'Appointment rescheduled successfully.'
      );
      setRescheduleModal(false);
      setTargetAppointment(null);
      setSelectedRescheduleSlots([]);
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

  const totalDocPages = Math.ceil(filteredDoctors.length / docLimit) || 1;
  const paginatedDoctors = filteredDoctors.slice((docPage - 1) * docLimit, docPage * docLimit);

  const now = new Date();
  const upcomingAppointments = myAppointments
    .filter(
      (apt) => ['CONFIRMED', 'CHECKED_IN', 'SCHEDULED'].includes(apt.status) && new Date(apt.startAt) >= now
    )
    .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  const cancelledAppointments = myAppointments
    .filter((apt) => apt.status === 'CANCELLED')
    .sort((a, b) => new Date(b.startAt) - new Date(a.startAt));

  const filteredByTabAppointments =
    appointmentFilter === 'UPCOMING'
      ? upcomingAppointments
      : appointmentFilter === 'CANCELLED'
      ? cancelledAppointments
      : [...myAppointments].sort((a, b) => new Date(b.startAt) - new Date(a.startAt));

  const displayedAppointments = filteredByTabAppointments.filter((apt) => {
    if (!searchAptDoctor.trim()) return true;
    const q = searchAptDoctor.toLowerCase();
    const docName = (apt.doctorId?.name || '').toLowerCase();
    const deptName = (apt.departmentId?.name || apt.doctorId?.doctorProfile?.specialization || '').toLowerCase();
    const code = (apt.appointmentCode || '').toLowerCase();
    return docName.includes(q) || deptName.includes(q) || code.includes(q);
  });

  const totalAptPages = Math.ceil(displayedAppointments.length / aptLimit) || 1;
  const paginatedAppointments = displayedAppointments.slice((aptPage - 1) * aptLimit, aptPage * aptLimit);

  // Next upcoming visit is strictly the earliest upcoming visit
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
              {formatTimeRange(nextVisit.startAt, nextVisit.endAt)}
            </div>
          </div>
        )}
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="portal-metrics-row">
        <div
          className="portal-metric-card"
          onClick={() => { setAppointmentFilter('ALL'); setAptPage(1); }}
          style={{ cursor: 'pointer' }}
          title="Show all visits"
        >
          <div className="portal-metric-icon-box visits">📅</div>
          <div className="portal-metric-content">
            <span className="metric-number">{myAppointments.length}</span>
            <span className="metric-label">Total visits</span>
          </div>
        </div>
        <div
          className="portal-metric-card"
          onClick={() => { setAppointmentFilter('UPCOMING'); setAptPage(1); }}
          style={{ cursor: 'pointer' }}
          title="Show upcoming visits"
        >
          <div className="portal-metric-icon-box upcoming">⏱️</div>
          <div className="portal-metric-content">
            <span className="metric-number">{upcomingAppointments.length}</span>
            <span className="metric-label">Upcoming</span>
          </div>
        </div>
        <div
          className="portal-metric-card"
          onClick={() => { setAppointmentFilter('CANCELLED'); setAptPage(1); }}
          style={{ cursor: 'pointer' }}
          title="Show cancelled visits"
        >
          <div className="portal-metric-icon-box cancelled">✕</div>
          <div className="portal-metric-content">
            <span className="metric-number">{cancelledAppointments.length}</span>
            <span className="metric-label">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Main Section: Dynamic by Tab (Dashboard shows both, Book a visit or My appointments shows single panel) */}
      <div className={`portal-two-column-layout ${currentTab !== 'dashboard' ? 'single-panel' : ''}`}>
        {/* Column: Book a visit */}
        {showBook && (
          <div className="portal-white-panel">
          <h2 className="panel-heading">Book a visit</h2>
          <p className="panel-subheading">Search by doctor name or specialty, then choose a time.</p>

          {/* Search and Dept Filter */}
          <div className="filter-input-row">
            <div className="portal-search-wrap">
              <input
                type="text"
                placeholder="Search by doctor name or specialty..."
                value={searchDoctor}
                onChange={(e) => {
                  setSearchDoctor(e.target.value);
                  setDocPage(1);
                }}
                className="doc-search-field"
              />
              {searchDoctor && (
                <button
                  type="button"
                  className="clear-portal-search-btn"
                  onClick={() => {
                    setSearchDoctor('');
                    setDocPage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Custom Styled Department Dropdown */}
            <div className="portal-dept-select-wrap" ref={deptDropdownRef}>
              <button
                type="button"
                className={`custom-searchable-trigger portal-dept-trigger ${deptDropdownOpen ? 'open' : ''}`}
                onClick={() => setDeptDropdownOpen((prev) => !prev)}
              >
                <span className="trigger-text">
                  {selectedDept === 'ALL'
                    ? 'All departments'
                    : departments.find((d) => d._id === selectedDept)?.name || 'All departments'}
                </span>
                <span className="trigger-chevron">▾</span>
              </button>

              {deptDropdownOpen && (
                <div className="custom-searchable-dropdown-panel portal-dept-dropdown-panel">
                  <div className="dropdown-options-list">
                    <div
                      className={`dropdown-option-item ${selectedDept === 'ALL' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDept('ALL');
                        setDeptDropdownOpen(false);
                        setDocPage(1);
                      }}
                    >
                      <div className="option-doctor-info">
                        <span className="option-doctor-name">All departments</span>
                      </div>
                      {selectedDept === 'ALL' && <span className="option-check">✓</span>}
                    </div>

                    {departments.map((dept) => {
                      const isSelected = selectedDept === dept._id;
                      return (
                        <div
                          key={dept._id}
                          className={`dropdown-option-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDept(dept._id);
                            setDeptDropdownOpen(false);
                            setDocPage(1);
                          }}
                        >
                          <div className="option-doctor-info">
                            <span className="option-doctor-name">{dept.name}</span>
                          </div>
                          {isSelected && <span className="option-check">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Doctor List */}
          <div className="portal-doctor-list">
            {paginatedDoctors.length === 0 ? (
              <div className="no-docs-text">No doctors available matching your search.</div>
            ) : (
              paginatedDoctors.map((doc) => {
                const initial = doc.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
                const spec = doc.doctorProfile?.specialization || 'General Medicine';
                const fee = doc.doctorProfile?.consultationFee;
                const isAmber = doc.name.includes('Sarah') || spec.toLowerCase().includes('cardio');

                return (
                  <div
                    key={doc._id}
                    className="portal-doctor-row-item smooth-card-item"
                  >
                    <div className={`doc-avatar-initial ${isAmber ? 'amber' : 'teal'}`}>{initial}</div>
                    <div className="doc-info-block">
                      <div className="doc-full-name">{doc.name}</div>
                      <div className="doc-details-meta">
                        {spec} · 5+ yrs
                      </div>
                      <div className={`doc-fee-pill ${fee ? 'paid' : 'free'}`}>
                        {fee ? `₹${fee} per visit` : 'Free consultation'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-book-action"
                      onClick={() => {
                        setSelectedSlots([]);
                        setBookingDoctor(doc);
                      }}
                    >
                      Book
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {filteredDoctors.length > docLimit && (
            <div className="portal-pagination-wrap">
              <Pagination
                page={docPage}
                totalPages={totalDocPages}
                total={filteredDoctors.length}
                limit={docLimit}
                onPageChange={setDocPage}
                itemName="doctors"
              />
            </div>
          )}
        </div>
        )}

        {/* Column: My Appointments */}
        {showAppointments && (
        <div className="portal-white-panel">
          <h2 className="panel-heading">My appointments</h2>
          <p className="panel-subheading">Live status of your consultations.</p>

          {/* Tab Filter and Search row */}
          <div className="portal-appointments-controls-row">
            <div className="appointment-toggle-bar">
              <button
                type="button"
                className={`apt-toggle-btn ${appointmentFilter === 'UPCOMING' ? 'active' : ''}`}
                onClick={() => {
                  setAppointmentFilter('UPCOMING');
                  setAptPage(1);
                }}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={`apt-toggle-btn ${appointmentFilter === 'CANCELLED' ? 'active' : ''}`}
                onClick={() => {
                  setAppointmentFilter('CANCELLED');
                  setAptPage(1);
                }}
              >
                Cancelled
              </button>
              <button
                type="button"
                className={`apt-toggle-btn ${appointmentFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => {
                  setAppointmentFilter('ALL');
                  setAptPage(1);
                }}
              >
                All
              </button>
            </div>

            {/* Search appointments by doctor */}
            <div className="portal-apt-search-wrap">
              <input
                type="text"
                placeholder="Search appointments by doctor..."
                value={searchAptDoctor}
                onChange={(e) => {
                  setSearchAptDoctor(e.target.value);
                  setAptPage(1);
                }}
                className="apt-doc-search-input"
              />
              {searchAptDoctor && (
                <button
                  type="button"
                  className="clear-portal-search-btn"
                  onClick={() => {
                    setSearchAptDoctor('');
                    setAptPage(1);
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* List of Visits */}
          <div className="portal-visits-list">
            {paginatedAppointments.length === 0 ? (
              <div className="portal-empty-appointments-card">
                <div className="empty-apt-icon-box">📅</div>
                <h4 className="empty-apt-title">
                  {searchAptDoctor ? 'No matching appointments' : `No ${appointmentFilter.toLowerCase()} appointments`}
                </h4>
                <p className="empty-apt-desc">
                  {searchAptDoctor
                    ? `No appointment records found matching "${searchAptDoctor}".`
                    : appointmentFilter === 'UPCOMING'
                    ? "You don't have any upcoming visits scheduled right now. Search doctors to book a consultation."
                    : appointmentFilter === 'CANCELLED'
                    ? 'No cancelled appointments on record.'
                    : 'You have not booked any appointments yet.'}
                </p>
                {searchAptDoctor ? (
                  <button
                    type="button"
                    className="btn-empty-clear-search"
                    onClick={() => {
                      setSearchAptDoctor('');
                      setAptPage(1);
                    }}
                  >
                    Clear Doctor Search
                  </button>
                ) : (
                  currentTab === 'my' && (
                    <button
                      type="button"
                      className="btn-empty-book-visit"
                      onClick={() => setSearchParams({ tab: 'book' })}
                    >
                      + Book a Visit Now
                    </button>
                  )
                )}
              </div>
            ) : (
              paginatedAppointments.map((apt) => {
                const dateObj = new Date(apt.startAt);
                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const dayStr = dateObj.getDate();
                const timeStr = formatTimeRange(apt.startAt, apt.endAt);
                const canModify = ['CONFIRMED', 'PENDING'].includes(apt.status);
                const feeVal = apt.consultationFee ? `₹${apt.consultationFee}` : '';
                const deptName = apt.departmentId?.name || (apt.doctorId?.doctorProfile?.specialization) || 'General Medicine';
                const isAmber = deptName.toLowerCase().includes('cardio') || (apt.doctorId?.name || '').includes('Sarah');

                return (
                  <div
                    key={apt._id}
                    className="visit-card-compact-row smooth-card-item"
                  >
                    <div className={`visit-date-badge-box ${isAmber ? 'amber' : 'teal'}`}>
                      <span className="badge-month">{monthStr}</span>
                      <span className="badge-day">{dayStr}</span>
                    </div>

                    <div className="visit-main-meta-col">
                      <div className="visit-compact-doc-name">
                        Dr. {apt.doctorId?.name?.replace('Dr. ', '') || 'Clinician'}
                      </div>
                      <div className="visit-compact-sub-line">
                        {deptName} · {timeStr} {feeVal ? `· ${feeVal} ` : ''}· {apt.appointmentCode}
                      </div>
                    </div>

                    <div className="visit-status-actions-col">
                      <span className={`visit-compact-status ${apt.status.toLowerCase()}`}>
                        {apt.status === 'CONFIRMED' ? 'Confirmed' : apt.status}
                      </span>
                      {canModify && (
                        <div className="visit-compact-links">
                          <button
                            type="button"
                            className="link-compact-reschedule"
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
                            className="link-compact-cancel"
                            onClick={() => setCancelTargetId(apt._id)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {displayedAppointments.length > 0 && (
            <div className="portal-pagination-wrap">
              <Pagination
                page={aptPage}
                totalPages={totalAptPages}
                total={displayedAppointments.length}
                limit={aptLimit}
                onPageChange={setAptPage}
                itemName="visits"
              />
            </div>
          )}
        </div>
        )}
      </div>

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
              <div className="slots-header-line" style={{ marginBottom: '0.5rem' }}>
                <span className="modal-field-label">Available Time Slots</span>
                <span className="slots-hint-badge">
                  {selectedRescheduleSlots.length > 0
                    ? `${selectedRescheduleSlots.length} slot(s) selected`
                    : 'Tap to select one or multiple slots'}
                </span>
              </div>
              {rescheduleSlots.length === 0 ? (
                <div className="slots-empty-box">No available slots on this date.</div>
              ) : (
                <div className="modal-slots-grid">
                  {rescheduleSlots.map((s, idx) => {
                    const isSelected = selectedRescheduleSlots.includes(s.startAt);
                    const timeStr = formatTimeRange(s.startAt, s.endAt);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => handleToggleRescheduleSlot(s)}
                        className={`modal-slot-chip ${isSelected ? 'selected' : ''} ${!s.isAvailable ? 'booked' : ''}`}
                        title={!s.isAvailable ? (s.conflictReason || 'Already booked') : `Slot: ${timeStr}`}
                      >
                        {timeStr}
                        {isSelected && <span className="slot-check-icon">✓</span>}
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
                disabled={rescheduling || selectedRescheduleSlots.length === 0}
                onClick={handleConfirmReschedule}
              >
                {rescheduling
                  ? 'Saving...'
                  : selectedRescheduleSlots.length > 0
                  ? `Confirm Reschedule (${selectedRescheduleSlots.length} slots)`
                  : 'Confirm Reschedule'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment visit? This action cannot be undone."
        confirmText="Yes, Cancel Visit"
        cancelText="Keep Appointment"
        variant="danger"
        loading={cancelling}
      />

      {/* Doctor Consultation Booking Popup Modal */}
      {bookingDoctor && (
        <div className="booking-modal-backdrop" onClick={() => setBookingDoctor(null)}>
          <div className="booking-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <div className="booking-modal-doc-meta">
                <div className="modal-doc-avatar">
                  {bookingDoctor.name.replace('Dr. ', '').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="modal-doc-name">{bookingDoctor.name}</h3>
                  <p className="modal-doc-spec">
                    {bookingDoctor.doctorProfile?.specialization || 'Consultant Physician'} · {bookingDoctor.departmentId?.name || 'General OPD'}
                  </p>
                  <span className="modal-doc-fee">
                    Fee: {bookingDoctor.doctorProfile?.consultationFee ? `₹${bookingDoctor.doctorProfile.consultationFee}` : 'Free consultation'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="booking-modal-close-btn"
                onClick={() => setBookingDoctor(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="booking-modal-body">
              <div className="booking-modal-date-row">
                <label className="modal-field-label">Appointment Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setSelectedSlots([]);
                  }}
                  className="modal-date-input"
                />
              </div>

              <div className="booking-modal-slots-section">
                <div className="slots-header-line">
                  <span className="modal-field-label">Available Time Slots</span>
                  <span className="slots-hint-badge">
                    {selectedSlots.length > 0
                      ? `${selectedSlots.length} slot(s) selected`
                      : 'Tap to select one or multiple slots'}
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="slots-loading-box">Loading open consultation slots...</div>
                ) : slots.length === 0 ? (
                  <div className="slots-empty-box">No bookable slots on this date. Please choose another date above.</div>
                ) : (
                  <div className="modal-slots-grid">
                    {slots.map((s, idx) => {
                      const isSelected = selectedSlots.includes(s.startAt);
                      const timeStr = formatTimeRange(s.startAt, s.endAt);
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!s.isAvailable}
                          onClick={() => handleToggleSlot(s)}
                          className={`modal-slot-chip ${isSelected ? 'selected' : ''} ${!s.isAvailable ? 'booked' : ''}`}
                          title={!s.isAvailable ? (s.conflictReason || 'Already booked') : `Slot: ${timeStr}`}
                        >
                          {timeStr}
                          {isSelected && <span className="slot-check-icon">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="booking-modal-footer">
              <button
                type="button"
                className="modal-btn-cancel"
                onClick={() => setBookingDoctor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn-confirm"
                disabled={bookingSubmitting || selectedSlots.length === 0}
                onClick={handleConfirmBooking}
              >
                {bookingSubmitting
                  ? 'Booking...'
                  : selectedSlots.length === 0
                  ? 'Select a time slot'
                  : `Confirm booking (${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
