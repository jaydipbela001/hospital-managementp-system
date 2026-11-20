import React, { useState, useEffect } from 'react';
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

const formatTime12 = (t24) => {
  if (!t24) return '';
  const [h, m] = t24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
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

  const cachedApts = dataCache.get('doctor_appointments');
  const [appointments, setAppointments] = useState(cachedApts || []);
  const [loading, setLoading] = useState(!cachedApts);
  const [filterTab, setFilterTab] = useState(isSchedulePath ? 'SCHEDULE' : 'TODAY'); // 'TODAY' | 'UPCOMING' | 'HISTORY'

  // Pagination state for appointments queue
  const [docAptPage, setDocAptPage] = useState(1);
  const [docAptLimit, setDocAptLimit] = useState(5);

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
      const last = curShifts[curShifts.length - 1];
      let nextStart = '17:00';
      let nextEnd = '20:00';
      if (last?.endTime) {
        const [h, m] = last.endTime.split(':').map(Number);
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

  const fetchDoctorAppointments = async (isBackground = false) => {
    try {
      if (!isBackground && !dataCache.get('doctor_appointments')) setLoading(true);
      const res = await apiClient('/appointments');
      const data = res.data || [];
      setAppointments(data);
      dataCache.set('doctor_appointments', data);
    } catch (err) {
      if (!isBackground) toast.error('Failed to load clinician appointments.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

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
            newDaily[d].shifts.push({ startTime: item.startTime, endTime: item.endTime });
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
          const sorted = [...cfg.shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  useEffect(() => {
    if (location.pathname === '/schedule' || searchParams.get('tab')?.toUpperCase() === 'SCHEDULE') {
      setFilterTab('SCHEDULE');
    } else if (location.pathname === '/appointments' && !searchParams.get('tab')) {
      setFilterTab('TODAY');
    }
  }, [location.pathname, searchParams]);

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

  const displayedList =
    filterTab === 'TODAY'
      ? todayAppointments
      : filterTab === 'UPCOMING'
      ? upcomingAppointments
      : previousAppointments;

  const totalDocAptPages = Math.ceil(displayedList.length / docAptLimit) || 1;
  const paginatedList = displayedList.slice((docAptPage - 1) * docAptLimit, docAptPage * docAptLimit);

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
        <div className="doctor-dash-header">
          <div>
            <span className="role-kicker">Clinician Schedule</span>
            <h2 className="doctor-dash-title">My Working Hours &amp; Schedule</h2>
            <p className="doctor-dash-sub">
              Manage your weekly working days, daily shifts, and consultation slot durations.
            </p>
          </div>
        </div>
      ) : (
        <div className="doctor-dash-header">
          <div>
            <span className="role-kicker">Clinician Workstation</span>
            <h2 className="doctor-dash-title">Doctor Consultation Dashboard</h2>
            <p className="doctor-dash-sub">
              Review your patient queue, start diagnostic consultations, record medical notes, and complete encounters.
            </p>
          </div>
          <div className="doctor-header-right-side">
            <div className="doctor-kpi-group">
              <div className="doc-kpi-card">
                <span className="kpi-label">Today's Total</span>
                <span className="kpi-val">{todayAppointments.length}</span>
              </div>
              <div className="doc-kpi-card checked-in">
                <span className="kpi-label">Checked-In / Waiting</span>
                <span className="kpi-val">
                  {todayAppointments.filter((a) => a.status === 'CHECKED_IN').length}
                </span>
              </div>
              <div className="doc-kpi-card done">
                <span className="kpi-label">Completed Today</span>
                <span className="kpi-val">
                  {todayAppointments.filter((a) => a.status === 'COMPLETED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs navigation - Only on Appointments */}
      {!isSchedulePath && (
        <div className="doctor-tabs-bar">
          <button
            type="button"
            className={`doctor-tab-pill ${filterTab === 'TODAY' ? 'active' : ''}`}
            onClick={() => {
              setDocAptPage(1);
              setFilterTab('TODAY');
            }}
          >
            Today's Schedule ({todayAppointments.length})
          </button>
          <button
            type="button"
            className={`doctor-tab-pill ${filterTab === 'UPCOMING' ? 'active' : ''}`}
            onClick={() => {
              setDocAptPage(1);
              setFilterTab('UPCOMING');
            }}
          >
            Upcoming Bookings ({upcomingAppointments.length})
          </button>
          <button
            type="button"
            className={`doctor-tab-pill ${filterTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => {
              setDocAptPage(1);
              setFilterTab('HISTORY');
            }}
          >
            Encounter History ({previousAppointments.length})
          </button>
        </div>
      )}

      {/* View Switch: Schedule Configuration or Queue Table */}
      {isSchedulePath ? (
        !isEditingSchedule ? (
          /* View Mode: Currently Configured Schedule */
          <div className="doctor-schedule-card">
            <div className="doc-sched-header">
              <div>
                <h3 className="doc-sched-title">Current Consultation Schedule</h3>
                <p className="doc-sched-subtitle">
                  Review your active working hours and patient appointment timings currently set in the system.
                </p>
              </div>
              <div className="doc-sched-actions">
                <button
                  type="button"
                  className="btn-edit-schedule-main"
                  onClick={() => setIsEditingSchedule(true)}
                >
                  ✏️ Edit Schedule
                </button>
              </div>
            </div>

            {loadingSchedule ? (
              <div className="doc-table-loader">Loading your current schedule...</div>
            ) : (
              <div className="doc-sched-body">
                {/* Stats Summary Cards */}
                <div className="sched-view-stats-row">
                  <div className="sched-stat-card">
                    <span className="sched-stat-label">Active Working Days</span>
                    <span className="sched-stat-value">
                      {Object.values(dailyAvailability).filter((d) => d.isWorking).length} Days / Week
                    </span>
                    <span className="sched-stat-help">Available for patient appointments</span>
                  </div>
                  <div className="sched-stat-card">
                    <span className="sched-stat-label">Consultation Slot Duration</span>
                    <span className="sched-stat-value">{slotDuration} Minutes</span>
                    <span className="sched-stat-help">Per appointment window</span>
                  </div>
                  <div className="sched-stat-card">
                    <span className="sched-stat-label">Weekly Shift Slots</span>
                    <span className="sched-stat-value">
                      {Object.values(dailyAvailability)
                        .filter((d) => d.isWorking)
                        .reduce((acc, d) => acc + (d.shifts?.length || 0), 0)}{' '}
                      Active Shifts
                    </span>
                    <span className="sched-stat-help">Across all working days</span>
                  </div>
                </div>

                {/* 7-Day Overview Cards */}
                <div className="doc-sched-section">
                  <label className="doc-sched-label">
                    Weekly Hours by Day
                    <span className="doc-sched-hint">Currently active consultation hours for each day of the week</span>
                  </label>
                  <div className="sched-view-grid">
                    {DAYS.map((d) => {
                      const cfg = dailyAvailability[d.value] || { isWorking: false, shifts: [] };
                      return (
                        <div key={d.value} className={`sched-day-card ${!cfg.isWorking ? 'off' : ''}`}>
                          <div className="sched-day-card-header">
                            <span className="sched-day-card-name">{d.full}</span>
                            <Badge variant={cfg.isWorking ? 'success' : 'neutral'}>
                              {cfg.isWorking ? 'Working' : 'Day Off'}
                            </Badge>
                          </div>
                          <div className="sched-day-card-body">
                            {cfg.isWorking && cfg.shifts && cfg.shifts.length > 0 ? (
                              <div className="slot-pill-group">
                                {cfg.shifts.map((s, idx) => (
                                  <span key={idx} className="slot-time-pill">
                                    {formatTime12(s.startTime)} – {formatTime12(s.endTime)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="sched-day-empty">No appointments scheduled (Day Off)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
                            <span className="sched-time-preview">{formatTime12(shift.startTime)}</span>
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
                            <span className="sched-time-preview">{formatTime12(shift.endTime)}</span>
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
        /* Appointments List / Table */
        <div className="doctor-appointments-table-card">
          {loading ? (
            <div className="doc-table-loader">Loading consultation encounters...</div>
          ) : displayedList.length === 0 ? (
            <div className="doc-empty-state">
              <p>No appointments found in this view.</p>
              <span>Newly booked patient appointments will instantly appear here.</span>
            </div>
          ) : (
            <div className="doc-table-wrap">
              <table className="doctor-queue-table">
                <thead>
                  <tr>
                    <th>Time &amp; Token</th>
                    <th>Patient Details</th>
                    <th>Type &amp; Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="fade-in-rows">
                  {paginatedList.map((apt) => {
                    const time12 = formatTimeRange(apt.startAt, apt.endAt);
                    const dateShort = new Date(apt.startAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                    const pat = apt.patientId || {};

                    return (
                      <tr
                        key={apt._id}
                        className={`smooth-table-row ${apt.status === 'IN_PROGRESS' ? 'row-in-progress' : ''}`}
                      >
                        <td>
                          <div className="cell-time-val">{time12}</div>
                          <div className="cell-date-sub">{dateShort} • {apt.appointmentCode}</div>
                        </td>
                        <td>
                          <div className="cell-patient-name">{pat.name || 'Walk-in Patient'}</div>
                          <div className="cell-patient-sub">
                            {pat.patientCode} • {pat.gender || 'Unknown'} • {pat.bloodGroup || 'Blood: N/A'}
                          </div>
                        </td>
                        <td>
                          <span className="cell-type-chip">{apt.appointmentType || 'CONSULTATION'}</span>
                          <div className="cell-reason-text">{apt.reason || 'Routine checkup'}</div>
                        </td>
                        <td>
                          <Badge variant={getStatusVariant(apt.status)}>{apt.status}</Badge>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="doc-action-btns">
                            {apt.status === 'CHECKED_IN' && (
                              <button
                                type="button"
                                className="btn-start-consult"
                                onClick={() => handleUpdateStatus(apt._id, 'IN_PROGRESS')}
                              >
                                Call Patient In
                              </button>
                            )}
                            {apt.status === 'IN_PROGRESS' && (
                              <button
                                type="button"
                                className="btn-open-enc"
                                onClick={() => {
                                  setActiveConsultation(apt);
                                  setClinicalNotes(apt.consultationNotes || '');
                                }}
                              >
                                Write Rx &amp; Complete
                              </button>
                            )}
                            {['CONFIRMED', 'PENDING'].includes(apt.status) && (
                              <>
                                <button
                                  type="button"
                                  className="btn-quick-checkin"
                                  onClick={() => handleUpdateStatus(apt._id, 'CHECKED_IN')}
                                >
                                  Check In
                                </button>
                                <button
                                  type="button"
                                  className="btn-doc-cancel-apt"
                                  onClick={() => setCancelTargetApt(apt)}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {apt.status === 'CHECKED_IN' && (
                              <button
                                type="button"
                                className="btn-doc-cancel-apt"
                                onClick={() => setCancelTargetApt(apt)}
                              >
                                Cancel
                              </button>
                            )}
                            {apt.status === 'COMPLETED' && (
                              <button
                                type="button"
                                className="btn-view-notes"
                                onClick={() => {
                                  setActiveConsultation(apt);
                                  setClinicalNotes(apt.consultationNotes || '');
                                }}
                              >
                                View Summary
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {displayedList.length > 0 && (
            <div className="doc-pagination-wrap">
              <Pagination
                page={docAptPage}
                totalPages={totalDocAptPages}
                total={displayedList.length}
                limit={docAptLimit}
                onPageChange={setDocAptPage}
                onLimitChange={(newLimit) => {
                  setDocAptLimit(newLimit);
                  setDocAptPage(1);
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
