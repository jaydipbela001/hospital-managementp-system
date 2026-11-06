import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/AuthContext';
import { PageHeader, Badge } from '../../../components/common';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role || 'DOCTOR';

  // Role-specific config with customized metrics and direct action shortcuts
  const roleConfig = {
    SUPER_ADMIN: {
      title: 'Super Administrator Console',
      subtitle: 'Hospital-wide management, staff assignments, and audit control',
      kpis: [
        { label: 'System Access', value: 'Full Access', badge: 'Super Admin', help: 'Unrestricted administrative privileges' },
        { label: 'Departments', value: '11 Standard', badge: 'Configured', help: 'Operational medical units' },
        { label: 'Staff Governance', value: 'Active', badge: 'Supervision', help: 'Staff provisioning and role assignment' },
        { label: 'Audit & Health', value: 'Operational', badge: 'Normal', help: 'Core services running without exceptions' },
      ],
      actions: [
        { label: 'Manage Staff', path: '/doctors', icon: '👨‍⚕️' },
        { label: 'Manage Departments', path: '/departments', icon: '🏢' },
        { label: 'Hospital Settings', path: '/settings', icon: '⚙️' },
        { label: 'View Appointments', path: '/appointments', icon: '📅' },
      ],
    },
    HOSPITAL_ADMIN: {
      title: 'Hospital Operations Dashboard',
      subtitle: 'Facility logistics, departments, doctor allocations, and staffing',
      kpis: [
        { label: 'Facility Status', value: 'Open', badge: 'Active', help: 'Main Hospital Campus' },
        { label: 'Departments', value: 'Manageable', badge: 'Hospital Admin', help: 'All medical departments accessible' },
        { label: 'Staff Roster', value: 'Ready', badge: 'Verified', help: 'Doctors, nurses, and technicians' },
        { label: 'Billing Supervision', value: 'Enabled', badge: 'Invoices', help: 'Financial summaries and ledger' },
      ],
      actions: [
        { label: 'Departments', path: '/departments', icon: '🏢' },
        { label: 'Doctors & Staff', path: '/doctors', icon: '👨‍⚕️' },
        { label: 'Billing Center', path: '/billing', icon: '🧾' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
      ],
    },
    DOCTOR: {
      title: `Doctor Clinical Workspace: Dr. ${user?.name || ''}`,
      subtitle: 'Patient encounters, clinical observations, and diagnosis',
      kpis: [
        { label: 'Doctor Status', value: 'On Duty', badge: 'Clinical', help: 'Consultation schedule active' },
        { label: 'Assigned Consults', value: 'Live OPD', badge: 'Assigned', help: 'Outpatient queue' },
        { label: 'Active Inpatients', value: 'IPD Rounds', badge: 'Ward Care', help: 'Assigned admitted patients' },
        { label: 'Prescriptions', value: 'Digital Rx', badge: 'Standard', help: 'Prescription history' },
      ],
      actions: [
        { label: 'My Appointments', path: '/appointments', icon: '📅' },
        { label: 'OPD Consultations', path: '/opd', icon: '🩺' },
        { label: 'IPD Inpatient Rounds', path: '/ipd', icon: '🛏️' },
        { label: 'Patient Medical Records', path: '/patients', icon: '🏥' },
      ],
    },
    NURSE: {
      title: 'Nursing & Ward Care Station',
      subtitle: 'Patient vitals, nursing notes, bed allocation, and medication rounds',
      kpis: [
        { label: 'Ward Assignment', value: 'General Ward', badge: 'Nursing', help: 'Monitoring bed occupancy' },
        { label: 'Vitals Monitoring', value: 'Due Routine', badge: 'Inpatient', help: 'Routine 4-hour vital checks' },
        { label: 'Care Notes', value: 'Up to Date', badge: 'Records', help: 'Nursing shift documentation' },
        { label: 'OPD Queue', value: 'Standby', badge: 'Triage', help: 'Patient intake assistance' },
      ],
      actions: [
        { label: 'Inpatient Wards (IPD)', path: '/ipd', icon: '🛏️' },
        { label: 'Patient Intake & Vitals', path: '/patients', icon: '🏥' },
        { label: 'OPD Triage Support', path: '/opd', icon: '🩺' },
      ],
    },
    RECEPTIONIST: {
      title: 'Front Desk & Reception Station',
      subtitle: 'Patient registrations, appointment bookings, and admissions intake',
      kpis: [
        { label: 'Front Counter', value: 'Active', badge: 'Desk 1', help: 'Intake and reception' },
        { label: 'Patient Inquiries', value: 'Open', badge: 'Reception', help: 'New registration & lookups' },
        { label: 'Daily Bookings', value: 'Scheduled', badge: 'Calendar', help: 'Doctor appointment schedules' },
        { label: 'Billing Receipts', value: 'Ready', badge: 'Counter POS', help: 'Consultation fee collection' },
      ],
      actions: [
        { label: 'Register / Search Patient', path: '/patients', icon: '🏥' },
        { label: 'Book Appointment', path: '/appointments', icon: '📅' },
        { label: 'Collect Payment', path: '/billing', icon: '🧾' },
        { label: 'Doctor Availability', path: '/doctors', icon: '👨‍⚕️' },
      ],
    },
    PHARMACIST: {
      title: 'Pharmacy & Drug Dispensary',
      subtitle: 'Prescription fulfillment, medicine inventory, and batch tracking',
      kpis: [
        { label: 'Pharmacy Desk', value: 'Open', badge: 'Dispensing', help: 'Prescription verification' },
        { label: 'Stock Health', value: 'Monitored', badge: 'Active Batches', help: 'Inventory and stock limits' },
        { label: 'Expiry Alert', value: 'Zero Critical', badge: 'Safe', help: 'Batch expiry monitoring' },
        { label: 'Medicine Catalog', value: 'Active', badge: 'Catalogue', help: 'Medication catalog' },
      ],
      actions: [
        { label: 'Pharmacy Dispensary', path: '/pharmacy', icon: '💊' },
        { label: 'Stock & Medicine Catalog', path: '/pharmacy', icon: '📦' },
      ],
    },
    LAB_TECHNICIAN: {
      title: 'Laboratory Diagnostic Station',
      subtitle: 'Pathology sample tracking, diagnostic tests, and lab result entry',
      kpis: [
        { label: 'Lab Status', value: 'Operating', badge: 'Diagnostics', help: 'Sample processing active' },
        { label: 'Pending Tests', value: 'Sample Queue', badge: 'Orders', help: 'Doctor test orders' },
        { label: 'Result Entry', value: 'Verified Form', badge: 'Reports', help: 'Authorized results verification' },
        { label: 'Test Catalog', value: 'Ready', badge: 'Pathology', help: 'Configured charge sheet' },
      ],
      actions: [
        { label: 'Laboratory Orders', path: '/laboratory', icon: '🔬' },
        { label: 'Test Results Entry', path: '/laboratory', icon: '📋' },
      ],
    },
    PATIENT: {
      title: `Patient Portal: ${user?.name || ''}`,
      subtitle: 'Personal medical appointments, diagnosis reports, and billing history',
      kpis: [
        { label: 'Patient Status', value: 'Registered', badge: 'Portal', help: 'Profile verified' },
        { label: 'Upcoming Consult', value: 'Check Schedule', badge: 'Visits', help: 'Upcoming appointments' },
        { label: 'Prescriptions', value: 'Digital Access', badge: 'Rx List', help: 'Prescriptions from doctors' },
        { label: 'Billing Invoices', value: 'Receipts', badge: 'Payment', help: 'Download receipts' },
      ],
      actions: [
        { label: 'My Appointments', path: '/appointments', icon: '📅' },
      ],
    },
  };

  const current = roleConfig[role] || roleConfig.DOCTOR;

  return (
    <div className="dashboard-page" style={{ padding: '1.5rem' }}>
      <PageHeader
        title={current.title}
        subtitle={current.subtitle}
      />

      {/* Role specific quick action shortcuts */}
      <div style={{ margin: '1.5rem 0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>
          Authorized Department Modules
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {current.actions.map((act) => (
            <div
              key={act.label}
              onClick={() => navigate(act.path)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{act.icon}</span>
              <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{act.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Role KPI Cards */}
      <section className="kpi-grid" style={{ marginTop: '1.5rem' }}>
        {current.kpis.map((kpi, idx) => (
          <div className="kpi-card" key={idx}>
            <div className="kpi-header">
              <span className="kpi-label">{kpi.label}</span>
              <Badge variant="primary">{kpi.badge}</Badge>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <span className="kpi-help">{kpi.help}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default DashboardPage;
