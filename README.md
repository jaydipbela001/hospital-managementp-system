1. Appointment management — role responsibilities
Role	Appointment responsibilities
SUPER_ADMIN	View and manage appointments across the entire system
HOSPITAL_ADMIN	Manage hospital appointments, schedules and staff
RECEPTIONIST	Register patients and book, reschedule or cancel appointments
DOCTOR	View assigned appointments, start consultations and complete visits
NURSE	View assigned patient appointments and assist with patient check-in
PHARMACIST	No direct appointment management
LAB_TECHNICIAN	No direct appointment management
PATIENT	Book, view, reschedule and request cancellation of own appointments

2. Complete appointment workflow
Step 1: Patient registration

PATIENT / RECEPTIONIST

Patient registers an account or receptionist registers a walk-in patient.

Step 2: Select doctor

PATIENT / RECEPTIONIST

Select department, doctor and available date.

Step 3: Check availability

SYSTEM

Backend checks doctor schedule and prevents double booking.

Step 4: Appointment booking

PATIENT / RECEPTIONIST

Create appointment and generate appointment number.

Step 5: Appointment confirmation

SYSTEM / HOSPITAL_ADMIN

Confirm booking automatically if the slot is valid, or keep pending if manual approval is enabled.

Step 6: Patient check-in

RECEPTIONIST / NURSE

Verify patient arrival and mark checked-in.

Step 7: Doctor consultation

DOCTOR

Start consultation, record diagnosis and treatment.

Step 8: Complete appointment

DOCTOR

Save consultation and mark appointment completed.


3. Detailed role-wise actions
A. PATIENT
Patient dashboard should have an Appointment section.

Patient can:
1. View available departments.
2. View doctors by department.
3. View doctor profiles and specialization.
4. Check available appointment dates.
5. View available time slots.
6. Book an appointment.
7. View upcoming appointments.
8. View appointment history.
9. Request rescheduling.
10. Request cancellation.
11. View appointment status.
12. Receive email and Firebase push notifications.
Important: Patient can only access their own appointments.
B. RECEPTIONIST
Receptionist handles front-desk appointment operations.

Receptionist can:
1. Register new walk-in patients.
2. Search existing patients using patient ID, name or phone.
3. Book appointments for patients.
4. Select department and doctor.
5. Check doctor availability.
6. Book walk-in appointments.
7. Reschedule appointments.
8. Cancel appointments with a reason.
9. Mark patients as checked-in.
10. View today's appointment list.
11. View waiting patients.
12. Print appointment slips.
Important: Receptionist cannot modify a doctor's diagnosis or prescription.
C. DOCTOR
Doctor dashboard should display only appointments assigned to that doctor.

Doctor can:
1. View today's appointments.
2. View upcoming appointments.
3. View checked-in patients.
4. View patient medical history, subject to authorization.
5. Start consultation.
6. Record diagnosis.
7. Create prescriptions.
8. Request laboratory tests.
9. Add follow-up recommendations.
10. Mark consultation completed.
11. Record a no-show when appropriate.
Important: Doctor should not modify appointments assigned to another doctor unless explicitly authorized.
D. HOSPITAL_ADMIN
Hospital Admin controls appointment operations.

Hospital Admin can:
1. View all hospital appointments.
2. View doctor-wise appointments.
3. Create and update doctor schedules.
4. Manage doctor availability.
5. Configure appointment duration.
6. Configure consultation fees.
7. Approve or reject pending appointments if manual approval is enabled.
8. Reassign appointments when a doctor is unavailable.
9. Cancel appointments for operational reasons.
10. View appointment analytics.
E. SUPER_ADMIN
Super Admin has system-level access.
- View appointments across the entire system.
- Manage hospital-level configurations.
- Manage roles and permissions.
- View appointment reports.
- Monitor appointment activity.
Do not give Super Admin unrestricted access to clinical records by default just because of the role. Clinical access should be separately permission-controlled and audited.
F. NURSE
- View appointments for assigned doctors or departments.
- View checked-in patients.
- Assist with patient preparation.
- Record relevant observations where authorized.
- Update patient preparation status.
Nurses should not independently complete doctor consultations.
G. PHARMACIST and LAB_TECHNICIAN
These roles do not directly book or manage appointments.

They receive work from the consultation workflow:
- Pharmacist receives prescriptions.
- Lab Technician receives laboratory test orders.
4. Appointment status management
This is very important. Use a controlled status lifecycle instead of allowing users to enter any status.
Status	Meaning	Who changes it?
PENDING	Waiting for approval	System
CONFIRMED	Appointment booked	System / Hospital Admin
CHECKED_IN	Patient arrived	Receptionist / authorized Nurse
IN_PROGRESS	Consultation started	Doctor
COMPLETED	Consultation finished	Doctor
CANCELLED	Appointment cancelled	Patient request / authorized staff
REJECTED	Booking rejected	Hospital Admin
NO_SHOW	Patient did not arrive	Receptionist / authorized staff
RESCHEDULED	Original booking rescheduled	Patient / Receptionist / Admin

Recommended rule: Do not treat RESCHEDULED as the status of the new appointment. Keep the old appointment's history and create or link the new appointment. The new appointment receives CONFIRMED or PENDING.
5. Appointment booking example
Suppose:
- Patient: Rahul
- Doctor: Dr. Amit
- Department: Cardiology
- Date: 10 November
- Time: 10:30 AM
- Duration: 20 minutes
The workflow:
1. Rahul logs in.
2. Selects Cardiology.
3. Selects Dr. Amit.
4. Backend fetches available slots.
5. Rahul selects 10:30 AM.
6. Backend checks that the doctor is available.
7. Backend checks that the slot is not already booked.
8. Appointment is created.
9. Appointment number is generated, for example APT-2026-00001.
10. Appointment is confirmed automatically if manual approval is disabled.
11. Email and push notification are sent.
12. Receptionist checks in Rahul when he arrives.
13. Doctor starts consultation.
14. Doctor records diagnosis and prescription.
15. Doctor completes the appointment.
6. Appointment database structure
Recommended Mongoose model:

import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
];

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: {
      type: String,
      required: true,
      unique: true,
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      index: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "CONFIRMED",
      index: true,
    },

    consultationType: {
      type: String,
      enum: ["NEW", "FOLLOW_UP"],
      default: "NEW",
    },

    consultationFee: {
      type: Number,
      min: 0,
      required: true,
    },

    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cancellationReason: {
      type: String,
      default: null,
    },

    checkedInAt: Date,
    consultationStartedAt: Date,
    completedAt: Date,

    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
  },
  { timestamps: true }
);

export const Appointment =
  mongoose.models.Appointment ||
  mongoose.model("Appointment", appointmentSchema);

export default Appointment;


This is a starting schema. Add hospital/tenant references if your application supports multiple hospitals.
7. API endpoints and role permissions
Method	Endpoint	Allowed roles
GET	/appointments/doctors	PATIENT, RECEPTIONIST
GET	/appointments/available-slots	PATIENT, RECEPTIONIST
POST	/appointments	PATIENT, RECEPTIONIST
GET	/appointments/my	PATIENT
GET	/appointments	SUPER_ADMIN, HOSPITAL_ADMIN, RECEPTIONIST
GET	/appointments/doctor/my	DOCTOR
GET	/appointments/:id	Authorized roles
PATCH	/appointments/:id/confirm	HOSPITAL_ADMIN
PATCH	/appointments/:id/check-in	RECEPTIONIST, NURSE
PATCH	/appointments/:id/start	DOCTOR
PATCH	/appointments/:id/complete	DOCTOR
PATCH	/appointments/:id/cancel	PATIENT, RECEPTIONIST, HOSPITAL_ADMIN
PATCH	/appointments/:id/reschedule	PATIENT, RECEPTIONIST, HOSPITAL_ADMIN
PATCH	/appointments/:id/no-show	RECEPTIONIST, HOSPITAL_ADMIN

The endpoint role list is a starting point; enforce ownership, hospital scope and appointment assignment inside the service layer too.
8. Important backend business rules
Give your coding agent these rules:
1. Never trust patientId from the frontend for a patient booking. Derive it from the authenticated user.
2. Receptionist can book for an existing patient after verifying the patient record.
3. Doctor must have an active schedule for the requested time.
4. Prevent overlapping appointments for the same doctor.
5. Prevent a patient from booking overlapping appointments.
6. Validate appointment start and end times on the backend.
7. Do not allow booking in the past.
8. Do not allow starting a consultation before check-in, except an explicitly authorized emergency workflow.
9. Only assigned doctors or authorized staff can update an appointment.
10. Completed appointments cannot be cancelled or rescheduled through normal workflows.
11. Every cancellation and reschedule must retain history and reason.
12. Use a safe concurrency strategy to prevent two requests from booking the same slot simultaneously. A simple availability check followed by insert is not sufficient.
13. Send notifications after successful database operations; notification failures must not undo a valid appointment.
14. Store dates in UTC and display them in the hospital's local timezone.
15. Keep an audit trail for important status changes.
For fixed appointment slots, a unique index on doctor and slot start can help prevent duplicates. If variable-duration appointments are supported, use a transaction or another atomic booking strategy that also checks interval overlap.