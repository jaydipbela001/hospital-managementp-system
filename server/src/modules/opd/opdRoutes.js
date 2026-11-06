import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getOpdConsultations,
  getOpdConsultationById,
  createOpdConsultation,
} from "./opdController.js";

export const opdRouter = Router();

opdRouter.use(authenticate);

// View OPD Records
opdRouter.get(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"),
  getOpdConsultations
);

opdRouter.get(
  "/:id",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "PATIENT"),
  getOpdConsultationById
);

// Create OPD & Prescribe: Clinicians only
opdRouter.post(
  "/",
  authorize("SUPER_ADMIN", "DOCTOR"),
  createOpdConsultation
);

export default opdRouter;

