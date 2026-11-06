import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getBeds,
  createBed,
  getAdmissions,
  admitPatient,
  addCareNote,
  dischargePatient,
} from "./ipdController.js";

export const ipdRouter = Router();

ipdRouter.use(authenticate);

// Beds
ipdRouter.get("/beds", getBeds);
ipdRouter.post("/beds", authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"), createBed);

// Admissions
ipdRouter.get("/", getAdmissions);
ipdRouter.post(
  "/admit",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"),
  admitPatient
);
ipdRouter.post(
  "/:id/care-notes",
  authorize("SUPER_ADMIN", "DOCTOR", "NURSE"),
  addCareNote
);
ipdRouter.post(
  "/:id/discharge",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "DOCTOR"),
  dischargePatient
);

export default ipdRouter;

