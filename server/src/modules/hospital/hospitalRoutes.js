import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uploadSingleImage } from "../../middleware/upload.js";
import {
  getHospitalProfile,
  updateHospitalProfile,
} from "./hospitalController.js";

export const hospitalRouter = Router();

hospitalRouter.get("/", authenticate, getHospitalProfile);
hospitalRouter.put(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  uploadSingleImage("logo"),
  updateHospitalProfile
);

export default hospitalRouter;

