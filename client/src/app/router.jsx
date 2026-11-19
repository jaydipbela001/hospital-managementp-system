import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import StaffPage from '../features/staff/pages/StaffPage';
import PatientsPage from '../features/patients/pages/PatientsPage';
import AppointmentsPage from '../features/appointments/pages/AppointmentsPage';
import ProtectedRoute from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Auth Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Focused Protected Routes: Patient, Doctor, Receptionist */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'DOCTOR', 'PATIENT', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/appointments"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'DOCTOR', 'PATIENT', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <AppointmentsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <ProtectedRoute allowedRoles={['DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <AppointmentsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <PatientsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctors"
        element={
          <ProtectedRoute allowedRoles={['RECEPTIONIST', 'SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <StaffPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Default fallback redirects to appointments for patients or dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRouter;
