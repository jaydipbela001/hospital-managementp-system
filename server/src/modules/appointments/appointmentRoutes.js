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
} from "./appointmentController.js";

export const appointmentRouter = Router();

appointmentRouter.use(authenticate);

// View appointments: Admin, Receptionist, Doctor, Nurse, Patient
appointmentRouter.get("/", getAppointments);

// Doctor schedule (working hours and exceptions)
appointmentRouter.get("/schedule", getDoctorSchedule);
appointmentRouter.put(
  "/schedule",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"),
  updateDoctorSchedule
);

// Calculate free slots for a doctor on a given date
appointmentRouter.get("/slots", getAvailableSlots);

// Book appointment: Front desk, Admins, and Patients
appointmentRouter.post(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "PATIENT"),
  createAppointment
);

// Update status (Confirm, Complete, Cancel, No-Show): Clinicians & Front desk
appointmentRouter.patch(
  "/:id/status",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR"),
  updateAppointmentStatus
);

export default appointmentRouter;

