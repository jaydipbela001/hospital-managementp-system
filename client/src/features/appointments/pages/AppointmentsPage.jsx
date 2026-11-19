import React from 'react';
import { useAuth } from '../../../app/providers/AuthContext';
import PatientPortalView from '../components/PatientPortalView';
import DoctorWorkstationView from '../components/DoctorWorkstationView';
import ReceptionistScheduleView from '../components/ReceptionistScheduleView';
import './AppointmentsPage.css';

export default function AppointmentsPage() {
  const { user } = useAuth();
  const role = user?.role || 'PATIENT';

  // Render role-tailored high-performance healthcare interfaces
  if (role === 'PATIENT') {
    return (
      <div className="hms-appointment-workflow-page">
        <PatientPortalView />
      </div>
    );
  }

  if (role === 'DOCTOR') {
    return (
      <div className="hms-appointment-workflow-page">
        <DoctorWorkstationView />
      </div>
    );
  }

  // SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST, NURSE
  return (
    <div className="hms-appointment-workflow-page">
      <ReceptionistScheduleView />
    </div>
  );
}
