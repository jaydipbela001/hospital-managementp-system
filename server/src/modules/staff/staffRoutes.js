import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadSingleImage } from "../../middleware/upload.js";
import {
  getStaff,
  createStaff,
  getStaffById,
  updateStaff,
} from "./staffController.js";

export const staffRouter = Router();

staffRouter.use(authenticate);

// Staff list: Admins can manage, Receptionists and Patients can read doctor lists for appointments
staffRouter.get("/", authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "PATIENT", "DOCTOR", "NURSE"), getStaff);
staffRouter.post(
  "/",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  uploadSingleImage("avatar"),
  createStaff
);
staffRouter.get("/:id", authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"), getStaffById);
staffRouter.put(
  "/:id",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  uploadSingleImage("avatar"),
  updateStaff
);

export default staffRouter;

