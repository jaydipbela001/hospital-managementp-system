import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import DepartmentsPage from '../features/departments/pages/DepartmentsPage';
import StaffPage from '../features/staff/pages/StaffPage';
import PatientsPage from '../features/patients/pages/PatientsPage';
import AppointmentsPage from '../features/appointments/pages/AppointmentsPage';
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
              <ModulePlaceholder
                moduleName="OPD Consultation"
                description="Outpatient encounters, clinical diagnoses, clinical notes, and prescription PDF generation."
                plannedPhase="Phase 6"
                icon="🩺"
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ipd"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <ModulePlaceholder
                moduleName="IPD, Wards & Beds"
                description="Inpatient admissions, ward/room bed allocation, nursing notes, and discharge summaries."
                plannedPhase="Phase 7"
                icon="🛏️"
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PHARMACIST', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <ModulePlaceholder
                moduleName="Pharmacy & Inventory"
                description="Medicine catalog, batch tracking, expiry monitoring, and prescription dispensing."
                plannedPhase="Phase 9"
                icon="💊"
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/laboratory"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'LAB_TECHNICIAN', 'HOSPITAL_ADMIN']}>
            <AdminLayout>
              <ModulePlaceholder
                moduleName="Laboratory Services"
                description="Diagnostic tests catalog, test ordering, sample processing, and lab result verification."
                plannedPhase="Phase 8"
                icon="🔬"
              />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/billing"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST']}>
            <AdminLayout>
              <ModulePlaceholder
                moduleName="Billing & Invoicing"
                description="Consolidated invoices (OPD/IPD/Lab/Pharmacy), payment receipts, and refunds."
                plannedPhase="Phase 10"
                icon="🧾"
              />
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
