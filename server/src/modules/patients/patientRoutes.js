import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadSingleImage } from "../../middleware/upload.js";
import {
  getPatients,
  registerPatient,
  getPatientById,
  updatePatient,
  uploadPatientDocument,
} from "./patientController.js";

export const patientRouter = Router();

patientRouter.use(authenticate);

// List patients: clinicians and front desk
patientRouter.get(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"),
  getPatients
);

// Register new patient: front desk and admins
patientRouter.post(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST"),
  registerPatient
);

// View patient profile: clinicians, front desk, and patient self-view (checked in controller)
patientRouter.get(
  "/:id",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE", "PATIENT"),
  getPatientById
);

// Update patient info: front desk and clinicians
patientRouter.put(
  "/:id",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE"),
  updatePatient
);

// Upload document attachment
patientRouter.post(
  "/:id/documents",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR"),
  uploadSingleImage("document"),
  uploadPatientDocument
);

export default patientRouter;

