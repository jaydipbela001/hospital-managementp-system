import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import DepartmentsPage from '../features/departments/pages/DepartmentsPage';
import StaffPage from '../features/staff/pages/StaffPage';
import PatientsPage from '../features/patients/pages/PatientsPage';
import AppointmentsPage from '../features/appointments/pages/AppointmentsPage';
import OpdPage from '../features/opd/pages/OpdPage';
import IpdPage from '../features/ipd/pages/IpdPage';
import LaboratoryPage from '../features/laboratory/pages/LaboratoryPage';
import PharmacyPage from '../features/pharmacy/pages/PharmacyPage';
import BillingPage from '../features/billing/pages/BillingPage';
import HospitalSettingsPage from '../features/settings/pages/HospitalSettingsPage';
import ModulePlaceholder from '../features/common/ModulePlaceholder';
import ProtectedRoute from './ProtectedRoute';

export function AppRouter() {
  return (
    <Routes>
      {/* Public Visual Auth Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Protected Layout Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/patients"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE']}>
            <AdminLayout>
              <PatientsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctors"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST']}>
            <AdminLayout>
              <StaffPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/appointments"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT']}>
            <AdminLayout>
              <AppointmentsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/departments"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <DepartmentsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/opd"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
            <AdminLayout>
              <OpdPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ipd"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <IpdPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PHARMACIST', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <PharmacyPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/laboratory"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LAB_TECHNICIAN', 'HOSPITAL_ADMIN', 'DOCTOR']}>
            <AdminLayout>
              <LaboratoryPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST']}>
            <AdminLayout>
              <BillingPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <HospitalSettingsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Default fallback redirects to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRouter;
