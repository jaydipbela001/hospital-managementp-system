import React, { useState, useEffect, useRef } from 'react';
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
  const tableWrapRef = useRef(null);
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
  const [timeframeFilter, setTimeframeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [appliedDate, setAppliedDate] = useState(initialDate);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL');
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);
  const [doctorFilterSearch, setDoctorFilterSearch] = useState('');
  const doctorDropdownRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  // Close doctor & status dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target)) {
        setDoctorDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => dataCache.getLimit('appointments', 5));

  // Booking Modal
  const [bookingModal, setBookingModal] = useState(false);
  const [modalPatientId, setModalPatientId] = useState('');
  const [isChangingPatient, setIsChangingPatient] = useState(false);
  const [bookingPatientSearch, setBookingPatientSearch] = useState('');
  const [bookingDeptFilter, setBookingDeptFilter] = useState('ALL');
  const [bookingDoctorSearch, setBookingDoctorSearch] = useState('');
  const [modalDoctorId, setModalDoctorId] = useState('');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalSlots, setModalSlots] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [modalReason, setModalReason] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Auto select first patient if available when opening modal
  useEffect(() => {
    if (bookingModal && !modalPatientId && patients.length > 0) {
      setModalPatientId(patients[0]._id);
    }
    if (bookingModal && !modalDoctorId && doctors.length > 0) {
      setModalDoctorId(doctors[0]._id);
    }
  }, [bookingModal, patients, doctors]);

  // Selected patient & doctor objects for preview
  const selectedPatientObj = patients.find((p) => p._id === modalPatientId);
  const selectedDoctorObj = doctors.find((d) => d._id === modalDoctorId);

  // Filtered patients for dropdown search
  const filteredPatients = patients.filter((p) => {
    if (!bookingPatientSearch.trim()) return true;
    const q = bookingPatientSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.patientCode || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  // Filtered doctors for booking modal
  const filteredBookingDoctors = doctors.filter((doc) => {
    const matchesDept =
      bookingDeptFilter === 'ALL' ||
      (doc.departmentId?._id || doc.departmentId) === bookingDeptFilter ||
      (doc.departmentId?.name && doc.departmentId.name === bookingDeptFilter);

    const matchesSearch =
      !bookingDoctorSearch.trim() ||
      doc.name.toLowerCase().includes(bookingDoctorSearch.toLowerCase()) ||
      (doc.departmentId?.name || '').toLowerCase().includes(bookingDoctorSearch.toLowerCase());

    return matchesDept && matchesSearch;
  });

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
      if (timeframeFilter && timeframeFilter !== 'CUSTOM') {
        queryParams.set('timeframe', timeframeFilter);
      } else if (appliedDate) {
        queryParams.set('date', appliedDate);
      }

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
  }, [timeframeFilter, appliedDate, selectedDoctorFilter, statusFilter]);

  // Fetch slots for booking modal
  useEffect(() => {
    if (!modalDoctorId || !modalDate) {
      setModalSlots([]);
      setSelectedSlots([]);
      return;
    }
    const loadSlots = async () => {
      try {
        setLoadingSlots(true);
        setSelectedSlots([]);
        const patParam = modalPatientId ? `&patientId=${modalPatientId}` : '';
        const res = await apiClient(`/appointments/slots?doctorId=${modalDoctorId}&date=${modalDate}${patParam}&_t=${Date.now()}`);
        setModalSlots(res?.data || []);
      } catch (e) {
        console.error('Failed to load slots:', e);
        setModalSlots([]);
      } finally {
        setLoadingSlots(false);
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

  // Filter appointments client-side by patient search query
  const filteredAppointmentsList = appointments.filter((apt) => {
    if (!patientSearchQuery.trim()) return true;
    const q = patientSearchQuery.toLowerCase();
    const patName = (apt.patientId?.name || '').toLowerCase();
    const patPhone = (apt.patientId?.phone || '').toLowerCase();
    const patCode = (apt.patientId?.patientCode || '').toLowerCase();
    return patName.includes(q) || patPhone.includes(q) || patCode.includes(q);
  });

  const totalPages = Math.ceil(filteredAppointmentsList.length / limit) || 1;
  const paginatedAppointments = filteredAppointmentsList.slice((page - 1) * limit, page * limit);

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
        {/* Timeframe Pills Filter */}
        <div className="ribbon-timeframe-pills">
          {[
            { id: 'ALL', label: 'All Appointments' },
            { id: 'TODAY', label: 'Today' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'PAST', label: 'Past' },
          ].map((tf) => (
            <button
              key={tf.id}
              type="button"
              className={`ribbon-tf-btn ${timeframeFilter === tf.id ? 'active' : ''}`}
              onClick={() => {
                setTimeframeFilter(tf.id);
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>

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
              disabled={dateFilter === appliedDate && timeframeFilter === 'CUSTOM'}
              onClick={() => {
                setAppliedDate(dateFilter);
                setTimeframeFilter('CUSTOM');
              }}
              title="Apply Date Filter"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="ribbon-field ribbon-doctor-select-field" ref={doctorDropdownRef}>
          <label>Attending Doctor:</label>
          <div className="custom-searchable-select-wrap">
            <button
              type="button"
              className={`custom-searchable-trigger ${doctorDropdownOpen ? 'open' : ''}`}
              onClick={() => setDoctorDropdownOpen((prev) => !prev)}
            >
              <span className="trigger-text">
                {selectedDoctorFilter === 'ALL'
                  ? 'All Doctors'
                  : doctors.find((d) => d._id === selectedDoctorFilter)?.name || 'All Doctors'}
              </span>
              <span className="trigger-chevron">▾</span>
            </button>

            {doctorDropdownOpen && (
              <div className="custom-searchable-dropdown-panel">
                <div className="dropdown-search-box">
                  <input
                    type="text"
                    placeholder="Search doctor by name..."
                    value={doctorFilterSearch}
                    onChange={(e) => setDoctorFilterSearch(e.target.value)}
                    className="dropdown-search-input"
                    autoFocus
                  />
                  {doctorFilterSearch && (
                    <button
                      type="button"
                      className="clear-dropdown-search-btn"
                      onClick={() => setDoctorFilterSearch('')}
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="dropdown-options-list">
                  <div
                    className={`dropdown-option-item ${selectedDoctorFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDoctorFilter('ALL');
                      setDoctorDropdownOpen(false);
                      setDoctorFilterSearch('');
                    }}
                  >
                    <div className="option-doctor-avatar all">ALL</div>
                    <div className="option-doctor-info">
                      <span className="option-doctor-name">All Doctors</span>
                      <span className="option-doctor-sub">Hospital-wide schedule</span>
                    </div>
                    {selectedDoctorFilter === 'ALL' && <span className="option-check">✓</span>}
                  </div>

                  {doctors
                    .filter((d) => {
                      if (!doctorFilterSearch.trim()) return true;
                      const q = doctorFilterSearch.toLowerCase();
                      return (
                        d.name.toLowerCase().includes(q) ||
                        (d.doctorProfile?.specialization || '').toLowerCase().includes(q) ||
                        (d.departmentId?.name || '').toLowerCase().includes(q)
                      );
                    })
                    .map((d) => {
                      const isSelected = selectedDoctorFilter === d._id;
                      const initials = d.name
                        .replace(/^Dr\.\s*/i, '')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'DR';
                      const spec = d.doctorProfile?.specialization || d.departmentId?.name || 'General';

                      return (
                        <div
                          key={d._id}
                          className={`dropdown-option-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedDoctorFilter(d._id);
                            setDoctorDropdownOpen(false);
                            setDoctorFilterSearch('');
                          }}
                        >
                          <div className="option-doctor-avatar">{initials}</div>
                          <div className="option-doctor-info">
                            <span className="option-doctor-name">{d.name}</span>
                            <span className="option-doctor-sub">{spec}</span>
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

        {/* Patient Search in Filter Ribbon */}
        <div className="ribbon-field ribbon-patient-search-field">
          <label>Search Patient:</label>
          <div className="ribbon-search-input-wrap">
            <input
              type="text"
              placeholder="Search by name, phone, code..."
              value={patientSearchQuery}
              onChange={(e) => {
                setPatientSearchQuery(e.target.value);
                setPage(1);
              }}
              className="field-input-sm ribbon-patient-search-input"
            />
            {patientSearchQuery && (
              <button
                type="button"
                className="clear-ribbon-search-btn"
                onClick={() => {
                  setPatientSearchQuery('');
                  setPage(1);
                }}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="ribbon-field ribbon-status-select-field" ref={statusDropdownRef}>
          <label>Status:</label>
          <div className="custom-searchable-select-wrap status-select-wrap">
            <button
              type="button"
              className={`custom-searchable-trigger status-trigger ${statusDropdownOpen ? 'open' : ''}`}
              onClick={() => setStatusDropdownOpen((prev) => !prev)}
            >
              <span className="trigger-text">
                {statusFilter === 'ALL' ? 'All Statuses' : statusFilter.replace('_', ' ')}
              </span>
              <span className="trigger-chevron">▾</span>
            </button>

            {statusDropdownOpen && (
              <div className="custom-searchable-dropdown-panel status-dropdown-panel">
                <div className="dropdown-options-list">
                  {[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'CONFIRMED', label: 'Confirmed' },
                    { value: 'CHECKED_IN', label: 'Checked In' },
                    { value: 'IN_PROGRESS', label: 'In Progress' },
                    { value: 'COMPLETED', label: 'Completed' },
                    { value: 'CANCELLED', label: 'Cancelled' },
                  ].map((st) => {
                    const isSelected = statusFilter === st.value;
                    return (
                      <div
                        key={st.value}
                        className={`dropdown-option-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setStatusFilter(st.value);
                          setStatusDropdownOpen(false);
                        }}
                      >
                        <span className={`status-dot-indicator ${st.value.toLowerCase()}`}></span>
                        <div className="option-doctor-info">
                          <span className="option-doctor-name">{st.label}</span>
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

        <div className="ribbon-stats-badge">
          Showing <strong>{filteredAppointmentsList.length}</strong> patient bookings
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
          <div ref={tableWrapRef} className="reception-table-wrap">
            <table className="reception-queue-table">
              <thead>
                <tr>
                  <th>Date &amp; Time</th>
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
                  const aptDateStr = apt.startAt
                    ? new Date(apt.startAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '';
                  const pat = apt.patientId || {};
                  const doc = apt.doctorId || {};

                  return (
                    <tr key={apt._id} className="smooth-table-row">
                      <td>
                        <div className="apt-table-date">{aptDateStr}</div>
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

        {filteredAppointmentsList.length > 0 && (
          <div className="reception-pagination-wrap">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filteredAppointmentsList.length}
              limit={limit}
              onPageChange={(newPage) => {
                setPage(newPage);
                if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
              }}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                dataCache.setLimit('appointments', newLimit);
                setPage(1);
                if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
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
          title="Book an appointment"
          size="large"
        >
          <div className="book-apt-modal-subheading">
            Reception desk · Patient appointment booking
          </div>

          <form onSubmit={handleCreateAppointment} className="modal-booking-form modern-booking-modal-form">
            {/* Selected Patient Banner Card */}
            <div className="patient-banner-card">
              <div className="patient-banner-left">
                <div className="patient-avatar-circle">
                  {selectedPatientObj?.name
                    ? selectedPatientObj.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'PT'}
                </div>
                <div className="patient-banner-info">
                  <div className="patient-banner-name">
                    {selectedPatientObj?.name || 'Select a patient'}
                  </div>
                  <div className="patient-banner-sub">
                    {selectedPatientObj
                      ? `${selectedPatientObj.patientCode || 'PAT'} · ${selectedPatientObj.phone || 'No phone'}`
                      : 'No patient selected'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-change-patient"
                onClick={() => setIsChangingPatient((prev) => !prev)}
              >
                {isChangingPatient ? 'Done' : 'Change'}
              </button>
            </div>

            {/* Expandable Patient Selection (Searchable Card List) */}
            {isChangingPatient && (
              <div className="patient-selection-dropdown-box">
                <div className="patient-selection-header">
                  <span className="selection-label">Select Patient ({filteredPatients.length} found)</span>
                  <button
                    type="button"
                    className="btn-link-register"
                    onClick={() => setPatientModal(true)}
                  >
                    + Register New
                  </button>
                </div>

                {/* Patient Search Input */}
                <div className="search-input-wrap patient-search-bar">
                  <input
                    type="text"
                    placeholder="Search name, code or phone"
                    value={bookingPatientSearch}
                    onChange={(e) => setBookingPatientSearch(e.target.value)}
                    className="field-input booking-search-input"
                    autoFocus
                  />
                  {bookingPatientSearch && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setBookingPatientSearch('')}
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Patient Cards List */}
                {filteredPatients.length === 0 ? (
                  <div className="no-patients-found-msg">
                    No patients match "{bookingPatientSearch}".
                  </div>
                ) : (
                  <div className="patient-cards-scroll-list">
                    {filteredPatients.map((p) => {
                      const isSelected = modalPatientId === p._id;
                      const pInitials = p.name
                        ? p.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()
                        : 'PT';

                      return (
                        <div
                          key={p._id}
                          className={`patient-card-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setModalPatientId(p._id);
                            setIsChangingPatient(false);
                            setBookingPatientSearch('');
                          }}
                        >
                          <div className="patient-card-avatar">{pInitials}</div>

                          <div className="patient-card-center-col">
                            <div className="patient-card-name-row">
                              <span className="patient-card-name">{p.name}</span>
                              {p.gender && <span className="patient-gender-tag">{p.gender}</span>}
                            </div>
                            <div className="patient-card-details-row">
                              <span className="patient-code-badge">{p.patientCode || 'PAT'}</span>
                              {p.phone && <span className="patient-phone-val">{p.phone}</span>}
                            </div>
                          </div>

                          <div className="patient-card-actions-col">
                            {p.bloodGroup && p.bloodGroup !== 'UNKNOWN' && (
                              <span className="patient-blood-badge">{p.bloodGroup}</span>
                            )}
                            {isSelected && (
                              <span className="patient-selected-check-badge">✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DIRECT: ALL DEPARTMENTS */}
            <div className="booking-step-section">
              <div className="step-title-row">
                <span className="step-num-badge">1</span>
                <span className="step-label">DEPARTMENT</span>
              </div>
              <div className="dept-pills-row">
                <button
                  type="button"
                  className={`dept-pill-btn ${bookingDeptFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => {
                    setBookingDeptFilter('ALL');
                    setModalDoctorId('');
                  }}
                >
                  All Departments
                </button>
                {departments.map((dept) => {
                  const isSelected = bookingDeptFilter === dept._id || bookingDeptFilter === dept.name;
                  return (
                    <button
                      key={dept._id}
                      type="button"
                      className={`dept-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setBookingDeptFilter(dept._id);
                        setModalDoctorId('');
                      }}
                    >
                      {dept.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DIRECT: SEARCH DOCTOR & DOCTOR CARDS */}
            <div className="booking-step-section">
              <div className="step-title-row">
                <span className="step-num-badge">2</span>
                <span className="step-label">DOCTOR</span>
                {filteredBookingDoctors.length > 0 && (
                  <span className="doc-count-tag">({filteredBookingDoctors.length} available)</span>
                )}
              </div>

              {/* Doctor Search Bar */}
              <div className="search-input-wrap search-doctor-bar">
                <input
                  type="text"
                  placeholder="Search doctor by name or specialty..."
                  value={bookingDoctorSearch}
                  onChange={(e) => setBookingDoctorSearch(e.target.value)}
                  className="field-input booking-search-input"
                />
                {bookingDoctorSearch && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setBookingDoctorSearch('')}
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Doctor Cards List */}
              {filteredBookingDoctors.length === 0 ? (
                <div className="no-docs-card">
                  No doctors match the selected department or search keyword.
                </div>
              ) : (
                <div className="doctor-cards-list">
                  {filteredBookingDoctors.map((doc) => {
                    const isSelected = modalDoctorId === doc._id;
                    const initials = doc.name
                      .replace(/^Dr\.\s*/i, '')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'DR';
                    const deptName = doc.departmentId?.name || 'General Medicine';
                    const fee = doc.consultationFee !== undefined ? `₹${doc.consultationFee}` : '₹0';

                    return (
                      <div
                        key={doc._id}
                        className={`doctor-item-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setModalDoctorId(doc._id)}
                      >
                        <div className="doctor-card-left">
                          <div className="doctor-select-radio">
                            <span className={`custom-radio-circle ${isSelected ? 'checked' : ''}`}></span>
                          </div>
                          <div className="doctor-avatar-circle">{initials}</div>
                          <div className="doctor-info-block">
                            <div className="doctor-card-name-row">
                              <span className="doctor-card-name">{doc.name}</span>
                              <span className="doctor-dept-pill">{deptName}</span>
                            </div>
                            <div className="doctor-card-sub">
                              {doc.experienceYears ? `${doc.experienceYears} yrs exp` : 'Consultant'}
                              {doc.phone ? ` · ${doc.phone}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="doctor-card-right">
                          <span className="doctor-avail-pill">● Available</span>
                          <span className="doctor-fee-text">{fee}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STEP 3: DATE SELECTION (CUSTOM DATE SELECTOR) */}
            <div className="booking-step-section">
              <div className="step-title-row">
                <span className="step-num-badge">3</span>
                <span className="step-label">APPOINTMENT DATE</span>
              </div>
              <div className="custom-date-picker-wrap">
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                  className="field-input date-input-field"
                />
              </div>
            </div>

            {/* STEP 4: TIME SLOTS (CATEGORIZED: MORNING / AFTERNOON) */}
            <div className="booking-step-section">
              <div className="step-title-row">
                <span className="step-num-badge">4</span>
                <span className="step-label">TIME</span>
                {selectedSlots.length > 0 && (
                  <span className="selected-counter-badge">({selectedSlots.length} selected)</span>
                )}
              </div>

              {loadingSlots ? (
                <div className="slots-loading-state">
                  <div className="spinner-sm"></div>
                  <span>Checking available doctor slots...</span>
                </div>
              ) : !modalDoctorId ? (
                <div className="select-doctor-hint">Please select a doctor above to view available time slots.</div>
              ) : modalSlots.length === 0 ? (
                <div className="no-slots-alert">No available slots for selected doctor on this date.</div>
              ) : (
                <div className="categorized-slots-container">
                  {/* Morning Slots (before 12:00 PM) */}
                  {(() => {
                    const morningSlots = modalSlots.filter((s) => {
                      const d = new Date(s.startAt);
                      return d.getHours() < 12;
                    });
                    if (morningSlots.length === 0) return null;
                    return (
                      <div className="slot-period-group">
                        <div className="slot-period-title">Morning</div>
                        <div className="slots-grid-modern">
                          {morningSlots.map((s, idx) => {
                            const isChosen = selectedSlots.some((slot) => slot.startAt === s.startAt);
                            const timeLabel = new Date(s.startAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            });
                            return (
                              <button
                                key={`m-${idx}`}
                                type="button"
                                disabled={!s.isAvailable}
                                title={!s.isAvailable ? (s.conflictReason || 'Booked') : `Slot: ${timeLabel}`}
                                onClick={() => {
                                  setSelectedSlots((prev) => {
                                    if (prev.some((slot) => slot.startAt === s.startAt)) {
                                      return prev.filter((slot) => slot.startAt !== s.startAt);
                                    }
                                    return [...prev, s];
                                  });
                                }}
                                className={`modern-slot-pill ${isChosen ? 'chosen' : ''} ${!s.isAvailable ? 'disabled' : ''}`}
                              >
                                {timeLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Afternoon / Evening Slots (12:00 PM onwards) */}
                  {(() => {
                    const afternoonSlots = modalSlots.filter((s) => {
                      const d = new Date(s.startAt);
                      return d.getHours() >= 12;
                    });
                    if (afternoonSlots.length === 0) return null;
                    return (
                      <div className="slot-period-group">
                        <div className="slot-period-title">Afternoon & Evening</div>
                        <div className="slots-grid-modern">
                          {afternoonSlots.map((s, idx) => {
                            const isChosen = selectedSlots.some((slot) => slot.startAt === s.startAt);
                            const timeLabel = new Date(s.startAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            });
                            return (
                              <button
                                key={`a-${idx}`}
                                type="button"
                                disabled={!s.isAvailable}
                                title={!s.isAvailable ? (s.conflictReason || 'Booked') : `Slot: ${timeLabel}`}
                                onClick={() => {
                                  setSelectedSlots((prev) => {
                                    if (prev.some((slot) => slot.startAt === s.startAt)) {
                                      return prev.filter((slot) => slot.startAt !== s.startAt);
                                    }
                                    return [...prev, s];
                                  });
                                }}
                                className={`modern-slot-pill ${isChosen ? 'chosen' : ''} ${!s.isAvailable ? 'disabled' : ''}`}
                              >
                                {timeLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* REASON FOR VISIT (OPTIONAL) */}
            <div className="booking-step-section">
              <label className="field-label-bold">REASON FOR VISIT (OPTIONAL)</label>
              <input
                type="text"
                placeholder="e.g. Fever and headache, knee pain, general checkup"
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                className="field-input modern-reason-input"
              />
            </div>

            {/* BOTTOM SUMMARY & CONFIRM BAR */}
            <div className="booking-bottom-confirm-bar">
              <div className="booking-summary-text">
                <div className="summary-doc-dept">
                  <strong>{selectedDoctorObj ? selectedDoctorObj.name : 'Choose Doctor'}</strong>
                  {selectedDoctorObj && ` · ${selectedDoctorObj.departmentId?.name || 'General Medicine'}`}
                </div>
                <div className="summary-date-fee">
                  {new Date(modalDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {selectedSlots.length > 0 && (
                    <>
                      {' · '}
                      {new Date(selectedSlots[0].startAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                      {selectedSlots.length > 1 && ` (+${selectedSlots.length - 1} slots)`}
                    </>
                  )}
                  {' · '}Fee <span className="summary-fee-val">{selectedDoctorObj?.consultationFee ? `₹${selectedDoctorObj.consultationFee}` : '₹0'}</span>
                </div>
              </div>

              <div className="booking-actions-right">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setBookingModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBooking || selectedSlots.length === 0}
                  className="btn-modal-confirm"
                >
                  {savingBooking ? 'Booking...' : 'Confirm appointment'}
                </button>
              </div>
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
