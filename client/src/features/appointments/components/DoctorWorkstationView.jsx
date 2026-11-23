import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiClient from '../../../services/apiClient';
import { dataCache } from '../../../services/dataCache';
import { Badge, Button, Modal, Pagination, ConfirmDialog } from '../../../components/common';
import '../pages/AppointmentsPage.css';

const DAYS = [
  { label: 'Mon', value: 1, full: 'Monday' },
  { label: 'Tue', value: 2, full: 'Tuesday' },
  { label: 'Wed', value: 3, full: 'Wednesday' },
  { label: 'Thu', value: 4, full: 'Thursday' },
  { label: 'Fri', value: 5, full: 'Friday' },
  { label: 'Sat', value: 6, full: 'Saturday' },
  { label: 'Sun', value: 0, full: 'Sunday' },
];

const formatTimeCompact = (t24) => {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const formatShiftRange = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const sPeriod = sh >= 12 ? 'PM' : 'AM';
  const ePeriod = eh >= 12 ? 'PM' : 'AM';
  const sHour = sh % 12 === 0 ? 12 : sh % 12;
  const eHour = eh % 12 === 0 ? 12 : eh % 12;

  const sText = sm === 0 ? `${sHour}` : `${sHour}:${String(sm).padStart(2, '0')}`;
  const eText = em === 0 ? `${eHour} ${ePeriod}` : `${eHour}:${String(em).padStart(2, '0')} ${ePeriod}`;

  // If same period e.g. 9:00 AM - 11:00 AM -> 9–11 AM
  if (sPeriod === ePeriod && sm === 0 && em === 0) {
    return `${sHour}–${eHour} ${ePeriod}`;
  }
  return `${sText} ${sPeriod} – ${eText}`;
};

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

export default function DoctorWorkstationView() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isSchedulePath = location.pathname === '/schedule';

  const initialDate = new Date().toISOString().split('T')[0];
  const cachedApts = dataCache.get('doctor_appointments');
  const [appointments, setAppointments] = useState(cachedApts || []);
  const [loading, setLoading] = useState(!cachedApts);
  const [isFiltering, setIsFiltering] = useState(false);
  const tableWrapRef = useRef(null);

  // Filter state for Doctor Consultation Dashboard
  const [timeframeFilter, setTimeframeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [appliedDate, setAppliedDate] = useState(initialDate);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

  // Pagination state for appointments queue
  const [docAptPage, setDocAptPage] = useState(1);
  const [docAptLimit, setDocAptLimit] = useState(5);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Per-Day & All-Days Schedule Configuration State
  const defaultDaily = {
    1: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '13:00', endTime: '16:00' }] },
    2: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '13:00', endTime: '16:00' }] },
    3: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '13:00', endTime: '16:00' }] },
    4: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '13:00', endTime: '16:00' }] },
    5: { isWorking: true, shifts: [{ startTime: '09:00', endTime: '11:00' }, { startTime: '13:00', endTime: '16:00' }] },
    6: { isWorking: false, shifts: [{ startTime: '09:00', endTime: '13:00' }] },
    0: { isWorking: false, shifts: [{ startTime: '09:00', endTime: '13:00' }] },
  };

  const [dailyAvailability, setDailyAvailability] = useState(defaultDaily);
  const [activeDay, setActiveDay] = useState(1); // 1 = Monday
  const [slotDuration, setSlotDuration] = useState(30);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);

  const activeDayCfg = dailyAvailability[activeDay] || { isWorking: false, shifts: [] };
  const activeDayMeta = DAYS.find((d) => d.value === activeDay) || DAYS[0];

  const handleToggleDayWorking = (dayVal) => {
    setDailyAvailability((prev) => ({
      ...prev,
      [dayVal]: {
        ...prev[dayVal],
        isWorking: !prev[dayVal]?.isWorking,
        shifts: prev[dayVal]?.shifts?.length > 0 ? prev[dayVal].shifts : [{ startTime: '09:00', endTime: '17:00' }],
      },
    }));
  };

  const handleAddShiftToDay = (dayVal) => {
    setDailyAvailability((prev) => {
      const curShifts = prev[dayVal]?.shifts || [];
      if (curShifts.length >= 6) {
        toast.info('Maximum 6 shifts per day.');
        return prev;
      }
      const last = curShifts[curShifts.length - 1];
      let nextStart = '17:00';
      let nextEnd = '20:00';
      if (last?.endTime) {
        const [h, m] = last.endTime.split(':').map(Number);
        if (h >= 22) {
          toast.warning('Cannot add more slots after 10:00 PM.');
          return prev;
        }
        const newStartH = Math.min(22, h + 1);
        const newEndH = Math.min(23, newStartH + 2);
        nextStart = `${String(newStartH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
        nextEnd = `${String(newEndH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      }
      return {
        ...prev,
        [dayVal]: {
          ...prev[dayVal],
          isWorking: true,
          shifts: [...curShifts, { startTime: nextStart, endTime: nextEnd }],
        },
      };
    });
  };

  const handleRemoveShiftFromDay = (dayVal, idx) => {
    setDailyAvailability((prev) => {
      const curShifts = prev[dayVal]?.shifts || [];
      if (curShifts.length <= 1) {
        toast.error('Each working day must have at least one slot.');
        return prev;
      }
      return {
        ...prev,
        [dayVal]: {
          ...prev[dayVal],
          shifts: curShifts.filter((_, i) => i !== idx),
        },
      };
    });
  };

  const handleUpdateDayShift = (dayVal, idx, field, value) => {
    setDailyAvailability((prev) => {
      const curShifts = [...(prev[dayVal]?.shifts || [])];
      curShifts[idx] = { ...curShifts[idx], [field]: value };
      return {
        ...prev,
        [dayVal]: {
          ...prev[dayVal],
          shifts: curShifts,
        },
      };
    });
  };

  const handleCopyDayTo = (targetDays, targetLabel) => {
    const sourceShifts = dailyAvailability[activeDay]?.shifts || [];
    if (sourceShifts.length === 0) {
      toast.error('Current day has no slots to copy.');
      return;
    }
    setDailyAvailability((prev) => {
      const next = { ...prev };
      for (const d of targetDays) {
        next[d] = {
          isWorking: true,
          shifts: sourceShifts.map((s) => ({ ...s })),
        };
      }
      return next;
    });
    toast.success(`Copied ${activeDayMeta.label}'s time slots to ${targetLabel}!`);
  };

  // Consultation Drawer / Modal
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ medicine: '', dosage: '1-0-1', duration: '5 days' }]);
  const [savingConsultation, setSavingConsultation] = useState(false);

  // Doctor appointment cancellation state
  const [cancelTargetApt, setCancelTargetApt] = useState(null);
  const [cancellingApt, setCancellingApt] = useState(false);

  const fetchDoctorAppointments = async (isFilterChange = false) => {
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
      if (statusFilter !== 'ALL') {
        queryParams.set('status', statusFilter);
      }

      const res = await apiClient(`/appointments?${queryParams.toString()}`);
      const data = res.data || [];
      setAppointments(data);
      dataCache.set('doctor_appointments', data);
    } catch (err) {
      toast.error('Failed to load clinician appointments.');
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    setDocAptPage(1);
    fetchDoctorAppointments(appointments.length > 0);
  }, [timeframeFilter, appliedDate, statusFilter]);

  const fetchDoctorSchedule = async () => {
    try {
      setLoadingSchedule(true);
      const res = await apiClient('/appointments/schedule');
      if (res.data) {
        const sched = res.data;
        if (sched.slotDurationMinutes) {
          setSlotDuration(sched.slotDurationMinutes);
        }
        const weekly = sched.weeklyAvailability || [];
        if (weekly.length > 0) {
          const newDaily = {};
          for (let d = 0; d <= 6; d++) {
            newDaily[d] = { isWorking: false, shifts: [{ startTime: '09:00', endTime: '17:00' }] };
          }
          for (const item of weekly) {
            const d = item.dayOfWeek;
            if (!newDaily[d].isWorking) {
              newDaily[d] = { isWorking: true, shifts: [] };
            }
            // Avoid duplicate identical shifts
            const isDup = newDaily[d].shifts.some(
              (s) => s.startTime === item.startTime && s.endTime === item.endTime
            );
            if (!isDup) {
              newDaily[d].shifts.push({ startTime: item.startTime, endTime: item.endTime });
            }
          }
          for (let d = 0; d <= 6; d++) {
            if (newDaily[d].isWorking && newDaily[d].shifts.length > 0) {
              newDaily[d].shifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
            }
          }
          setDailyAvailability(newDaily);
        }
      }
    } catch (err) {
      console.error('Failed to load doctor schedule:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e?.preventDefault?.();
    try {
      setSavingSchedule(true);
      const weeklyAvailability = [];

      for (const d of [1, 2, 3, 4, 5, 6, 0]) {
        const cfg = dailyAvailability[d];
        if (cfg?.isWorking && cfg.shifts && cfg.shifts.length > 0) {
          // Filter out duplicate identical slots and sort
          const uniqueMap = new Map();
          for (const s of cfg.shifts) {
            if (!s.startTime || !s.endTime) continue;
            const key = `${s.startTime}_${s.endTime}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, s);
            }
          }
          const uniqueShifts = Array.from(uniqueMap.values());
          const sorted = uniqueShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));

          for (let i = 0; i < sorted.length; i++) {
            const s = sorted[i];
            if (!s.startTime || !s.endTime) {
              toast.error(`Please provide valid start and end time for ${DAYS.find((item) => item.value === d)?.full}`);
              setSavingSchedule(false);
              return;
            }
            if (s.startTime >= s.endTime) {
              toast.error(`End time must be after start time for ${DAYS.find((item) => item.value === d)?.full} (Slot ${i + 1})`);
              setSavingSchedule(false);
              return;
            }
            // Check overlap with next shift
            if (i > 0) {
              const prevShift = sorted[i - 1];
              if (s.startTime < prevShift.endTime) {
                toast.error(`Overlap detected on ${DAYS.find((item) => item.value === d)?.full}: Slot "${formatShiftRange(prevShift.startTime, prevShift.endTime)}" overlaps with "${formatShiftRange(s.startTime, s.endTime)}"`);
                setSavingSchedule(false);
                return;
              }
            }

            weeklyAvailability.push({
              dayOfWeek: d,
              startTime: s.startTime,
              endTime: s.endTime,
            });
          }
        }
      }

      if (weeklyAvailability.length === 0) {
        toast.error('Please configure at least one active working day with consultation slots.');
        setSavingSchedule(false);
        return;
      }

      await apiClient('/appointments/schedule', {
        method: 'PUT',
        body: {
          weeklyAvailability,
          slotDurationMinutes: Number(slotDuration),
        },
      });

      await fetchDoctorSchedule();
      toast.success('Your weekly working hours updated successfully!');
      setIsEditingSchedule(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();
    fetchDoctorSchedule();

    const timer = setInterval(() => {
      fetchDoctorAppointments(true);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startAt).toISOString().split('T')[0];
    return aptDate === todayStr;
  });

  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startAt).toISOString().split('T')[0];
    return aptDate > todayStr && !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apt.status);
  });

  const previousAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.startAt).toISOString().split('T')[0];
    return aptDate < todayStr || ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(apt.status);
  });

  // Patient filter for Doctor's queue
  const filteredAppointmentsList = appointments.filter((apt) => {
    if (!patientSearchQuery.trim()) return true;
    const q = patientSearchQuery.toLowerCase();
    const pat = apt.patientId || {};
    const code = (apt.appointmentCode || '').toLowerCase();
    const reason = (apt.reason || '').toLowerCase();
    const pName = (pat.name || '').toLowerCase();
    const pCode = (pat.patientCode || '').toLowerCase();
    const pPhone = (pat.phone || '').toLowerCase();

    return (
      pName.includes(q) ||
      pCode.includes(q) ||
      pPhone.includes(q) ||
      code.includes(q) ||
      reason.includes(q)
    );
  });

  const totalDocAptPages = Math.ceil(filteredAppointmentsList.length / docAptLimit) || 1;
  const paginatedList = filteredAppointmentsList.slice((docAptPage - 1) * docAptLimit, docAptPage * docAptLimit);

  const handleCancelByDoctor = async () => {
    if (!cancelTargetApt) return;
    try {
      setCancellingApt(true);
      await apiClient(`/appointments/${cancelTargetApt._id}/status`, {
        method: 'PATCH',
        body: {
          status: 'CANCELLED',
          cancelReason: 'Doctor unavailable / leave',
        },
      });
      toast.success(`Appointment ${cancelTargetApt.appointmentCode} has been cancelled.`);
      setCancelTargetApt(null);
      fetchDoctorAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel appointment.');
    } finally {
      setCancellingApt(false);
    }
  };

  const handleUpdateStatus = async (aptId, newStatus, note = '') => {
    try {
      await apiClient(`/appointments/${aptId}/status`, {
        method: 'PATCH',
        body: { status: newStatus, note },
      });
      toast.success(`Patient marked as ${newStatus}`);
      fetchDoctorAppointments();
      if (newStatus === 'COMPLETED') {
        setActiveConsultation(null);
      }
    } catch (err) {
      toast.error(err.message || 'Status transition failed.');
    }
  };

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!clinicalNotes.trim()) {
      toast.error('Please enter clinical consultation notes.');
      return;
    }

    try {
      setSavingConsultation(true);
      const fullNote = `DIAGNOSIS: ${diagnosis}\nNOTES: ${clinicalNotes}\nPRESCRIPTIONS: ${prescriptions
        .filter((p) => p.medicine)
        .map((p) => `${p.medicine} (${p.dosage}, ${p.duration})`)
        .join(', ')}`;

      await apiClient(`/appointments/${activeConsultation._id}/status`, {
        method: 'PATCH',
        body: {
          status: 'COMPLETED',
          note: fullNote,
        },
      });
      toast.success('Consultation encounter completed and medical records saved.');
      setActiveConsultation(null);
      setClinicalNotes('');
      setDiagnosis('');
      fetchDoctorAppointments();
    } catch (err) {
      toast.error(err.message || 'Failed to complete consultation.');
    } finally {
      setSavingConsultation(false);
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

  return (
    <div className="doctor-workstation-container">
      {/* Clinician Header */}
      {isSchedulePath ? (
        <div className="doc-sched-v2-header">
          <div>
            <span className="role-kicker">Clinician Schedule</span>
            <h2 className="doc-sched-v2-title">My Working Hours &amp; Schedule</h2>
            <p className="doc-sched-v2-sub">
              Manage your weekly working days, daily shifts and consultation slot length.
            </p>
          </div>
          <div className="doc-sched-v2-actions">
            <button
              type="button"
              className="btn-sched-edit-pill"
              onClick={() => setIsEditingSchedule(true)}
            >
              ✎ Edit schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="reception-header-bar doctor-dash-reception-header">
          <div>
            <span className="role-kicker">Clinician Consultation &amp; Encounters</span>
            <h2 className="reception-title">Doctor Consultation Dashboard</h2>
            <p className="reception-sub">
              Review your patient queue, start consultations, record notes and complete encounters.
            </p>
          </div>
          <div className="header-actions reception-header-actions">
            <Button variant="neutral" onClick={() => navigate('/schedule')}>
              ⚙ My Working Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Filter Ribbon on Appointments (Same design & animations as reception) */}
      {!isSchedulePath && (
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

          {/* Schedule Date */}
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
                  setDocAptPage(1);
                }}
                className="field-input-sm ribbon-patient-search-input"
              />
              {patientSearchQuery && (
                <button
                  type="button"
                  className="clear-ribbon-search-btn"
                  onClick={() => {
                    setPatientSearchQuery('');
                    setDocAptPage(1);
                  }}
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Custom Dropdown */}
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
                      { value: 'CHECKED_IN', label: 'Checked In' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'CONFIRMED', label: 'Confirmed' },
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
      )}

      {/* View Switch: Schedule Configuration or Queue Table */}
      {isSchedulePath ? (
        !isEditingSchedule ? (
          /* View Mode: Currently Configured Schedule matching Mockup */
          <div className="doc-sched-v2-container">
            {/* Top 4 KPI Metrics */}
            <div className="sched-v2-metrics-row">
              {/* Working days */}
              <div className="sched-v2-metric-card">
                <div className="metric-icon-box blue">📅</div>
                <div className="metric-text-box">
                  <span className="metric-label">Working days</span>
                  <span className="metric-value">
                    {Object.values(dailyAvailability).filter((d) => d.isWorking).length} days / week
                  </span>
                  <span className="metric-sub">
                    {Object.values(dailyAvailability).filter((d) => !d.isWorking).length > 0
                      ? `${DAYS.find((d) => !dailyAvailability[d.value]?.isWorking)?.full || 'Sunday'} is a day off`
                      : 'All 7 days active'}
                  </span>
                </div>
              </div>

              {/* Slot length */}
              <div className="sched-v2-metric-card">
                <div className="metric-icon-box amber">⏱</div>
                <div className="metric-text-box">
                  <span className="metric-label">Slot length</span>
                  <span className="metric-value">{slotDuration} minutes</span>
                  <span className="metric-sub">Per appointment</span>
                </div>
              </div>

              {/* Weekly shifts */}
              <div className="sched-v2-metric-card">
                <div className="metric-icon-box mint">📋</div>
                <div className="metric-text-box">
                  <span className="metric-label">Weekly shifts</span>
                  <span className="metric-value">
                    {Object.values(dailyAvailability)
                      .filter((d) => d.isWorking)
                      .reduce((acc, d) => acc + (d.shifts?.length || 0), 0)} active shifts
                  </span>
                  <span className="metric-sub">
                    Across {Object.values(dailyAvailability).filter((d) => d.isWorking).length} working days
                  </span>
                </div>
              </div>

              {/* Weekly capacity */}
              <div className="sched-v2-metric-card">
                <div className="metric-icon-box purple">⌛</div>
                <div className="metric-text-box">
                  <span className="metric-label">Weekly capacity</span>
                  <span className="metric-value">
                    ~{Math.round(
                      (Object.values(dailyAvailability)
                        .filter((d) => d.isWorking)
                        .reduce((totalMins, d) => {
                          const dayMins = (d.shifts || []).reduce((acc, s) => {
                            if (!s.startTime || !s.endTime) return acc;
                            const [sh, sm] = s.startTime.split(':').map(Number);
                            const [eh, em] = s.endTime.split(':').map(Number);
                            return acc + ((eh * 60 + em) - (sh * 60 + sm));
                          }, 0);
                          return totalMins + Math.max(0, dayMins);
                        }, 0) / (slotDuration || 30))
                    )} slots
                  </span>
                  <span className="metric-sub">
                    Based on {Math.round(
                      Object.values(dailyAvailability)
                        .filter((d) => d.isWorking)
                        .reduce((totalMins, d) => {
                          const dayMins = (d.shifts || []).reduce((acc, s) => {
                            if (!s.startTime || !s.endTime) return acc;
                            const [sh, sm] = s.startTime.split(':').map(Number);
                            const [eh, em] = s.endTime.split(':').map(Number);
                            return acc + ((eh * 60 + em) - (sh * 60 + sm));
                          }, 0);
                          return totalMins + Math.max(0, dayMins);
                        }, 0) / 60
                    )} hours
                  </span>
                </div>
              </div>
            </div>

            {/* Main Schedule Content: Modern Clean 7-Day Card Schedule + Controls */}
            <div className="sched-v2-main-grid">
              {/* Left Column: Modern 7-Day Schedule Roster */}
              <div className="sched-days-roster-card">
                <div className="roster-card-header">
                  <div>
                    <h3 className="roster-title">Weekly Consultation Schedule</h3>
                    <p className="roster-sub">Active consultation shifts and timings configured for each day of the week</p>
                  </div>
                  <div className="roster-header-badge">
                    <span className="roster-badge-dot"></span>
                    <span>{Object.values(dailyAvailability).filter((d) => d.isWorking).length} of 7 Days Active</span>
                  </div>
                </div>

                <div className="sched-day-cards-list">
                  {DAYS.map((d) => {
                    const cfg = dailyAvailability[d.value] || { isWorking: false, shifts: [] };
                    const isWorking = cfg.isWorking && cfg.shifts && cfg.shifts.length > 0;

                    const totalMins = isWorking
                      ? cfg.shifts.reduce((acc, s) => {
                          if (!s.startTime || !s.endTime) return acc;
                          const [sh, sm] = s.startTime.split(':').map(Number);
                          const [eh, em] = s.endTime.split(':').map(Number);
                          return acc + ((eh * 60 + em) - (sh * 60 + sm));
                        }, 0)
                      : 0;
                    const hoursNum = Math.round((totalMins / 60) * 10) / 10;

                    return (
                      <div key={d.value} className={`sched-weekday-card ${!isWorking ? 'day-off-card' : ''}`}>
                        {/* Day Column */}
                        <div className="weekday-col-left">
                          <div className="weekday-badge-name">{d.label}</div>
                          <div className="weekday-text-meta">
                            <span className="weekday-fullname">{d.full}</span>
                            <span className="weekday-hours-stat">
                              {isWorking ? `${hoursNum} hrs • ${cfg.shifts.length} shift${cfg.shifts.length > 1 ? 's' : ''}` : 'No shifts'}
                            </span>
                          </div>
                        </div>

                        {/* Shifts Badges / Tags */}
                        <div className="weekday-shifts-col">
                          {isWorking ? (
                            <div className="shifts-pills-wrap">
                              {cfg.shifts.map((s, idx) => (
                                <div key={idx} className="modern-shift-tag">
                                  <span className="shift-clock-icon">🕒</span>
                                  <span className="shift-time-range">{formatShiftRange(s.startTime, s.endTime)}</span>
                                  <span className="shift-num-indicator">Shift {idx + 1}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="day-off-pill">
                              <span>🛋️ Day off — No appointments scheduled</span>
                            </div>
                          )}
                        </div>

                        {/* Status Right */}
                        <div className="weekday-status-col">
                          <span className={`roster-status-pill ${isWorking ? 'active' : 'inactive'}`}>
                            {isWorking ? '● Working' : '○ Off'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Slot duration & This week at a glance */}
              <div className="sched-v2-sidebar-col">
                {/* Slot Duration Selector Box */}
                <div className="sched-sidebar-box">
                  <h4 className="sidebar-box-title">Slot duration</h4>
                  <p className="sidebar-box-sub">Time given to each patient</p>
                  <div className="slot-duration-pills-row">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        className={`duration-pill-btn ${Number(slotDuration) === mins ? 'active' : ''}`}
                        onClick={async () => {
                          setSlotDuration(mins);
                          try {
                            await apiClient('/appointments/schedule', {
                              method: 'POST',
                              body: { slotDuration: mins },
                            });
                            toast.success(`Slot duration updated to ${mins} minutes`);
                          } catch (e) {
                            // Local fallback
                          }
                        }}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* This week at a glance */}
                <div className="sched-sidebar-box">
                  <h4 className="sidebar-box-title">This week at a glance</h4>
                  
                  <div className="glance-items-list">
                    {/* Longest day */}
                    <div className="glance-item">
                      <div className="glance-icon sun">☀️</div>
                      <div className="glance-info">
                        <span className="glance-name">Longest day</span>
                        <span className="glance-val">Friday • 9:00 AM – 10:00 PM</span>
                      </div>
                    </div>

                    {/* Evening shift */}
                    <div className="glance-item">
                      <div className="glance-icon moon">🌙</div>
                      <div className="glance-info">
                        <span className="glance-name">Evening shift</span>
                        <span className="glance-val">Thursday • 8:00 – 10:00 PM</span>
                      </div>
                    </div>

                    {/* Day off */}
                    <div className="glance-item">
                      <div className="glance-icon cal">📅</div>
                      <div className="glance-info">
                        <span className="glance-name">Day off</span>
                        <span className="glance-val">Sunday</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode: Modify Working Hours & Schedule */
          <div className="doctor-schedule-card">
            <div className="doc-sched-header">
              <div>
                <h3 className="doc-sched-title">Edit Working Hours &amp; Schedule</h3>
                <p className="doc-sched-subtitle">
                  Update timing particular to each day (Mon to Sun) or copy across days, then save changes.
                </p>
              </div>
              <div className="doc-sched-actions">
                <button
                  type="button"
                  className="btn-cancel-edit"
                  onClick={() => {
                    fetchDoctorSchedule();
                    setIsEditingSchedule(false);
                  }}
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                >
                  {savingSchedule ? 'Saving Changes...' : 'Save & Activate Schedule'}
                </Button>
              </div>
            </div>

            <div className="doc-sched-body">
              {/* Step 1: Select Day to Configure */}
              <div className="doc-sched-section">
                <label className="doc-sched-label">
                  1. Select a Day to Configure (Monday to Sunday)
                  <span className="doc-sched-hint">Click on any day below to customize its particular consultation slots</span>
                </label>
                <div className="days-nav-grid">
                  {DAYS.map((d) => {
                    const cfg = dailyAvailability[d.value] || { isWorking: false, shifts: [] };
                    const isSelected = activeDay === d.value;
                    return (
                      <div
                        key={d.value}
                        className={`day-nav-card ${isSelected ? 'active' : ''}`}
                        onClick={() => setActiveDay(d.value)}
                      >
                        <span className="day-nav-name">{d.label}</span>
                        <span className={`day-nav-badge ${!cfg.isWorking ? 'off' : ''}`}>
                          {cfg.isWorking
                            ? `${cfg.shifts?.length || 0} ${cfg.shifts?.length === 1 ? 'Slot' : 'Slots'}`
                            : 'Day Off'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Configure Selected Day */}
              <div className="day-editor-box">
                <div className="day-editor-header">
                  <div className="day-editor-title-row">
                    <span className="day-title-text">{activeDayMeta.full} Schedule</span>
                    <label className="day-toggle-label">
                      <input
                        type="checkbox"
                        className="day-toggle-checkbox"
                        checked={activeDayCfg.isWorking}
                        onChange={() => handleToggleDayWorking(activeDay)}
                      />
                      <span>{activeDayCfg.isWorking ? '✓ Available for appointments' : 'Marked as Day Off'}</span>
                    </label>
                  </div>

                  {activeDayCfg.isWorking && (
                    <div className="day-copy-actions">
                      <button
                        type="button"
                        className="btn-day-copy"
                        onClick={() => handleCopyDayTo([1, 2, 3, 4, 5], 'all weekdays (Mon–Fri)')}
                        title="Copy this day's timing to Mon, Tue, Wed, Thu, Fri"
                      >
                        📋 Copy {activeDayMeta.label}'s Slots to All Weekdays (Mon–Fri)
                      </button>
                      <button
                        type="button"
                        className="btn-day-copy"
                        onClick={() => handleCopyDayTo([1, 2, 3, 4, 5, 6, 0], 'all 7 days (Mon–Sun)')}
                        title="Copy this day's timing to all 7 days"
                      >
                        📋 Copy to All 7 Days
                      </button>
                    </div>
                  )}
                </div>

                {!activeDayCfg.isWorking ? (
                  <div className="day-off-banner">
                    <p>🛋️ You are marked as <strong>Off on {activeDayMeta.full}</strong>. No appointments will be booked on this day.</p>
                    <Button
                      variant="primary"
                      onClick={() => handleToggleDayWorking(activeDay)}
                    >
                      Enable Consultation on {activeDayMeta.full}
                    </Button>
                  </div>
                ) : (
                  <div className="day-shifts-list">
                    {activeDayCfg.shifts?.map((shift, idx) => (
                      <div key={idx} className="split-shift-card">
                        <div className="split-shift-title">
                          <div className="shift-title-left">
                            <span className="shift-indicator">{idx + 1}</span>
                            <span>Slot {idx + 1} for {activeDayMeta.full}</span>
                          </div>
                          {activeDayCfg.shifts.length > 1 && (
                            <button
                              type="button"
                              className="btn-remove-shift"
                              onClick={() => handleRemoveShiftFromDay(activeDay, idx)}
                              title="Remove this slot"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                        <div className="sched-time-row">
                          <div className="sched-time-field">
                            <label>Slot {idx + 1} Starts</label>
                            <input
                              type="time"
                              className="sched-time-input"
                              value={shift.startTime}
                              onChange={(e) => handleUpdateDayShift(activeDay, idx, 'startTime', e.target.value)}
                            />
                            <span className="sched-time-preview">{formatTimeCompact(shift.startTime)}</span>
                          </div>
                          <div className="sched-time-sep">to</div>
                          <div className="sched-time-field">
                            <label>Slot {idx + 1} Ends</label>
                            <input
                              type="time"
                              className="sched-time-input"
                              value={shift.endTime}
                              onChange={(e) => handleUpdateDayShift(activeDay, idx, 'endTime', e.target.value)}
                            />
                            <span className="sched-time-preview">{formatTimeCompact(shift.endTime)}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn-add-shift"
                      onClick={() => handleAddShiftToDay(activeDay)}
                    >
                      + Add Another Slot for {activeDayMeta.full}
                    </button>
                  </div>
                )}
              </div>

              {/* Step 3: Slot Duration */}
              <div className="doc-sched-section">
                <label className="doc-sched-label">
                  3. Patient Consultation Slot Duration
                  <span className="doc-sched-hint">Allocated appointment time window per patient</span>
                </label>
                <div className="slot-durations-row">
                  {[15, 20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`slot-duration-btn ${Number(slotDuration) === mins ? 'active' : ''}`}
                      onClick={() => setSlotDuration(mins)}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Save Action */}
              <div className="sched-footer-save" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-cancel-edit"
                  onClick={() => {
                    fetchDoctorSchedule();
                    setIsEditingSchedule(false);
                  }}
                >
                  Cancel
                </button>
                <Button
                  variant="primary"
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                >
                  {savingSchedule ? 'Saving Changes...' : 'Save & Activate Schedule'}
                </Button>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Appointments List / Table - Same reception design, progress bar, smooth animations & pagination */
        <div className={`reception-table-card ${isFiltering ? 'filtering' : ''}`}>
          {isFiltering && (
            <div className="table-filter-progress-bar">
              <div className="filter-progress-indeterminate"></div>
            </div>
          )}
          {loading ? (
            <div className="doc-table-loader">Loading consultation encounters...</div>
          ) : filteredAppointmentsList.length === 0 ? (
            <div className="doc-empty-state">
              <p>No appointments match the selected filters.</p>
              <span>Patient bookings assigned to you will appear here.</span>
            </div>
          ) : (
            <div ref={tableWrapRef} className="reception-table-wrap">
              <table className="reception-queue-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Patient Details</th>
                    <th>Chief Complaint / Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="fade-in-rows">
                  {paginatedList.map((apt) => {
                    const time12 = formatTimeRange(apt.startAt, apt.endAt);
                    const aptDateStr = apt.startAt
                      ? new Date(apt.startAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '';
                    const pat = apt.patientId || {};

                    return (
                      <tr
                        key={apt._id}
                        className={`smooth-table-row ${apt.status === 'IN_PROGRESS' ? 'row-in-progress' : ''}`}
                      >
                        <td>
                          <div className="apt-table-date">{aptDateStr}</div>
                          <div className="apt-table-time">{time12}</div>
                        </td>
                        <td>
                          <div className="pat-table-name">{pat.name || 'Walk-in Patient'}</div>
                          <div className="pat-table-phone">
                            {pat.phone ? `${pat.phone} • ` : ''}{pat.patientCode || 'PAT-NEW'}
                            {pat.bloodGroup ? ` • ${pat.bloodGroup}` : ''}
                          </div>
                        </td>
                        <td>
                          <div className="doc-reason-cell">
                            <span className="dept-pill">
                              {apt.appointmentType || 'Consultation'}
                            </span>
                            <span className="doc-reason-desc">{apt.reason || 'General Health'}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={getStatusVariant(apt.status)}>
                            {apt.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : apt.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="reception-action-btns">
                            {apt.status === 'CHECKED_IN' && (
                              <button
                                type="button"
                                className="btn-reception-checkin"
                                onClick={() => handleUpdateStatus(apt._id, 'IN_PROGRESS')}
                              >
                                Start Consultation
                              </button>
                            )}
                            {apt.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                className="btn-reception-checkin"
                                style={{ background: '#0284c7', borderColor: '#0284c7' }}
                                onClick={() => {
                                  setActiveConsultation(apt);
                                  setClinicalNotes(apt.consultationNotes || '');
                                }}
                              >
                                Continue Rx
                              </button>
                            )}
                            {['CONFIRMED', 'PENDING'].includes(apt.status) && (
                              <button
                                type="button"
                                className="btn-reception-cancel"
                                style={{ color: '#0f766e', borderColor: '#ccfbf1', background: '#f0fdf4' }}
                                onClick={() => {
                                  setActiveConsultation(apt);
                                  setClinicalNotes(apt.consultationNotes || '');
                                }}
                              >
                                View
                              </button>
                            )}
                            {apt.status === 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn-reception-cancel"
                                style={{ color: '#475569', borderColor: '#e2e8f0', background: '#f8fafc' }}
                                onClick={() => {
                                  setActiveConsultation(apt);
                                  setClinicalNotes(apt.consultationNotes || '');
                                }}
                              >
                                👁 Summary
                              </button>
                            )}
                            {['CONFIRMED', 'PENDING', 'CHECKED_IN'].includes(apt.status) && (
                              <button
                                type="button"
                                className="btn-reception-cancel"
                                onClick={() => setCancelTargetApt(apt)}
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
                page={docAptPage}
                totalPages={totalDocAptPages}
                total={filteredAppointmentsList.length}
                limit={docAptLimit}
                onPageChange={(newPage) => {
                  setDocAptPage(newPage);
                  if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
                }}
                onLimitChange={(newLimit) => {
                  setDocAptLimit(newLimit);
                  setDocAptPage(1);
                  if (tableWrapRef.current) tableWrapRef.current.scrollLeft = 0;
                }}
                itemName="appointments"
              />
            </div>
          )}
        </div>
      )}

      {/* Clinical Consultation Modal */}
      {activeConsultation && (
        <Modal
          isOpen={!!activeConsultation}
          onClose={() => setActiveConsultation(null)}
          title={`Clinical Encounter: ${activeConsultation.patientId?.name || 'Patient'} (${activeConsultation.appointmentCode})`}
          size="large"
        >
          <div className="clinical-modal-body">
            {/* Patient Header Card */}
            <div className="patient-medical-banner">
              <div>
                <strong>Age/Gender:</strong> {activeConsultation.patientId?.gender || 'N/A'}
              </div>
              <div>
                <strong>Blood Group:</strong> {activeConsultation.patientId?.bloodGroup || 'N/A'}
              </div>
              <div>
                <strong>Chief Complaint:</strong> {activeConsultation.reason || 'General Health'}
              </div>
            </div>

            {activeConsultation.status === 'COMPLETED' ? (
              <div className="completed-summary-box">
                <h4>Encounter Summary</h4>
                <pre className="summary-notes">{activeConsultation.consultationNotes || 'No notes documented.'}</pre>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                  <Button variant="neutral" onClick={() => setActiveConsultation(null)}>
                    Close Summary
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveConsultation} className="consultation-form">
                <div className="form-field">
                  <label className="field-label">Diagnosis / Clinical Impression *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute Viral Upper Respiratory Tract Infection, Essential Hypertension"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Clinical Examination &amp; Doctor Notes *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Patient presentation, vital observations (BP, Pulse, Temp), history, and advice..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    className="field-input"
                  />
                </div>

                <div className="prescription-section">
                  <label className="field-label">Prescription (Medicines, Dosages &amp; Directions)</label>
                  {prescriptions.map((p, idx) => (
                    <div key={idx} className="rx-row-grid">
                      <input
                        type="text"
                        placeholder="Medicine name (e.g. Paracetamol 650mg)"
                        value={p.medicine}
                        onChange={(e) => {
                          const updated = [...prescriptions];
                          updated[idx].medicine = e.target.value;
                          setPrescriptions(updated);
                        }}
                        className="field-input"
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 1-0-1 after food)"
                        value={p.dosage}
                        onChange={(e) => {
                          const updated = [...prescriptions];
                          updated[idx].dosage = e.target.value;
                          setPrescriptions(updated);
                        }}
                        className="field-input"
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g. 5 days)"
                        value={p.duration}
                        onChange={(e) => {
                          const updated = [...prescriptions];
                          updated[idx].duration = e.target.value;
                          setPrescriptions(updated);
                        }}
                        className="field-input"
                      />
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-rx"
                          onClick={() => setPrescriptions(prescriptions.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-add-rx"
                    onClick={() => setPrescriptions([...prescriptions, { medicine: '', dosage: '1-0-1', duration: '5 days' }])}
                  >
                    + Add Another Medication
                  </button>
                </div>

                <div className="modal-actions-footer">
                  <Button variant="neutral" onClick={() => setActiveConsultation(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={savingConsultation}>
                    {savingConsultation ? 'Saving Record...' : 'Complete Encounter & Save Prescription'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}

      {/* Doctor Cancel Appointment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTargetApt)}
        onClose={() => setCancelTargetApt(null)}
        onConfirm={handleCancelByDoctor}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel the booking for ${cancelTargetApt?.patientId?.name || 'this patient'} (${cancelTargetApt?.appointmentCode})?`}
        confirmText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        variant="danger"
        loading={cancellingApt}
      />
    </div>
  );
}
