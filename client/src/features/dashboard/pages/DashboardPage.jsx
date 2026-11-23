import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { Badge } from '../../../components/common';
import apiClient from '../../../services/apiClient';
import { dataCache } from '../../../services/dataCache';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'DOCTOR';

  // Warm up and prefetch all section data upon login so other tabs load instantly with zero spinners
  useEffect(() => {
    if (role === 'RECEPTIONIST') {
      const today = new Date().toISOString().split('T')[0];
      // Prefetch in background without blocking dashboard
      apiClient(`/appointments?date=${today}`).then((res) => {
        if (res?.data) dataCache.set(`appointments_${today}`, res.data);
      }).catch(() => {});

      apiClient('/staff?role=DOCTOR').then((res) => {
        if (res?.data) dataCache.set('doctors_list', res.data);
      }).catch(() => {});

      apiClient('/departments').then((res) => {
        if (res?.data) dataCache.set('departments_list', res.data);
      }).catch(() => {});

      apiClient('/patients?page=1&limit=5').then((res) => {
        if (res?.data) dataCache.set('patients_page_1_5', { data: res.data, meta: res.meta });
      }).catch(() => {});

      apiClient('/staff?page=1&limit=5').then((res) => {
        if (res?.data) dataCache.set('staff_page_1_5', { data: res.data, meta: res.meta });
      }).catch(() => {});
    }
  }, [role]);

  // Focused 3 Core Roles: Patient, Doctor, Receptionist
  const roleConfig = {
    DOCTOR: {
      kicker: 'Clinician Workspace',
      title: `Welcome, Dr. ${user?.name?.replace('Dr. ', '') || ''}`,
      subtitle: 'Manage your daily consultation queue, review appointments, and record clinical encounters.',
      kpis: [
        { label: 'Clinical Duty', value: 'On Duty', badge: 'Active', help: 'Schedule active' },
        { label: 'Patient Consults', value: 'Live Queue', badge: 'OPD', help: 'Appointments assigned to you' },
        { label: 'Encounters', value: 'Today Schedule', badge: 'Ready', help: 'Write notes & prescriptions' },
      ],
      actions: [
        { label: 'Appointments & Consultations', path: '/appointments', icon: '📅', desc: 'Call in patients and write prescriptions' },
        { label: 'My Working Hours & Schedule', path: '/schedule', icon: '⏰', desc: 'Set shift hours (9am–10pm or split 9–11am & 1–4pm) and working days' },
        { label: 'Patient Medical Records', path: '/patients', icon: '🏥', desc: 'Search patient histories & codes' },
      ],
    },
    RECEPTIONIST: {
      kicker: 'Front Desk Administration',
      title: 'Reception & Appointment Central',
      subtitle: 'Patient registration, appointment bookings, check-in triage, and doctor availability roster.',
      kpis: [
        { label: 'Front Counter', value: 'Active', badge: 'Desk 1', help: 'Patient intake & check-in' },
        { label: 'Patient Lookups', value: 'Master List', badge: 'Intake', help: 'Search or add walk-in patients' },
        { label: 'Appointments', value: 'Live Roster', badge: 'Today', help: 'Book, check-in, reschedule' },
      ],
      actions: [
        { label: 'Appointment Master Schedule', path: '/appointments', icon: '📅', desc: 'Hospital-wide schedule & check-in' },
        { label: 'Register / Search Patient', path: '/patients', icon: '🏥', desc: 'Add new walk-in patients' },
        { label: 'Doctor Availability Roster', path: '/doctors', icon: '👨‍⚕️', desc: 'View active specialist timings' },
      ],
    },
    PATIENT: {
      kicker: 'Patient Portal',
      title: `Welcome, ${user?.name || 'Patient'}`,
      subtitle: 'Self-service healthcare booking, doctor profiles, and appointment history.',
      kpis: [
        { label: 'Account', value: 'Active Patient', badge: 'Verified', help: 'Self-service enabled' },
        { label: 'Bookings', value: 'Open Slots', badge: 'Specialists', help: 'Cardiology, General OPD, etc.' },
      ],
      actions: [
        { label: 'Open Patient Portal', path: '/appointments', icon: '🩺', desc: 'Book consultations & view visits' },
      ],
    },
    SUPER_ADMIN: {
      kicker: 'Hospital Operations',
      title: 'Hospital Core Operations Console',
      subtitle: 'Primary workflow: Patient, Doctor, and Receptionist management.',
      kpis: [
        { label: 'Hospital Roster', value: 'Active', badge: 'Online', help: 'Core workflow active' },
      ],
      actions: [
        { label: 'Appointments Roster', path: '/appointments', icon: '📅', desc: 'Hospital appointments' },
        { label: 'Patient Master', path: '/patients', icon: '🏥', desc: 'Patient records' },
        { label: 'Doctors Roster', path: '/doctors', icon: '👨‍⚕️', desc: 'Staff directory' },
      ],
    },
  };

  const current = roleConfig[role] || roleConfig.DOCTOR;

  return (
    <div className="dashboard-page-container">
      {/* Top Hero Banner */}
      <div className="dashboard-hero-card">
        <span className="dash-hero-kicker">{current.kicker}</span>
        <h1 className="dash-hero-title">{current.title}</h1>
        <p className="dash-hero-subtitle">{current.subtitle}</p>
      </div>

      {/* KPI Cards Row */}
      <div className="dash-kpi-grid">
        {current.kpis.map((kpi, idx) => (
          <div className="dash-kpi-card" key={idx}>
            <div className="dash-kpi-top">
              <span className="dash-kpi-label">{kpi.label}</span>
              <span className="dash-kpi-badge">{kpi.badge}</span>
            </div>
            <div className="dash-kpi-value">{kpi.value}</div>
            <span className="dash-kpi-help">{kpi.help}</span>
          </div>
        ))}
      </div>

      {/* Quick Action Cards Section */}
      <div className="dash-actions-section">
        <h2 className="dash-section-title">Quick Actions &amp; Workspaces</h2>
        <div className="dash-action-cards-grid">
          {current.actions.map((act) => (
            <div
              key={act.label}
              className="dash-action-card"
              onClick={() => navigate(act.path)}
            >
              <div className="action-icon-circle">{act.icon}</div>
              <div className="action-info">
                <div className="action-label">{act.label}</div>
                <div className="action-desc">{act.desc}</div>
              </div>
              <div className="action-arrow">→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
