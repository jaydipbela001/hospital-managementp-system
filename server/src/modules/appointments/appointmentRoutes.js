import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getAppointments,
  getAvailableSlots,
  createAppointment,
  updateAppointmentStatus,
  getDoctorSchedule,
  updateDoctorSchedule,
  rescheduleAppointment,
} from "./appointmentController.js";

export const appointmentRouter = Router();

// Calculate free slots for a doctor on a given date (Public/Authenticated)
appointmentRouter.get("/slots", getAvailableSlots);

appointmentRouter.use(authenticate);

// Doctor schedule (working hours and exceptions)
appointmentRouter.get("/schedule", getDoctorSchedule);
appointmentRouter.put(
  "/schedule",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"),
  updateDoctorSchedule
);

// View appointments: Admin, Receptionist, Doctor, Nurse, Patient
appointmentRouter.get("/", getAppointments);

// Book appointment: Front desk, Admins, and Patients
appointmentRouter.post(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "PATIENT"),
  createAppointment
);

// Reschedule appointment
appointmentRouter.post(
  "/:id/reschedule",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"),
  rescheduleAppointment
);

// Update status (Confirm, Complete, Cancel, No-Show): Clinicians, Front desk, Patients
appointmentRouter.patch(
  "/:id/status",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"),
  updateAppointmentStatus
);

export default appointmentRouter;

