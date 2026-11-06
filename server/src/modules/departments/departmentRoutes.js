import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./departmentController.js";

export const departmentRouter = Router();

// Anyone authenticated can view active departments (Doctors, Nurses, Receptionists, Admins)
departmentRouter.get("/", authenticate, getDepartments);

// Only Super Admin and Hospital Admin can create, modify, or delete departments
departmentRouter.post(
  "/",
  authenticate,
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  createDepartment
);
departmentRouter.put(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  updateDepartment
);
departmentRouter.delete(
  "/:id",
  authenticate,
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN"),
  deleteDepartment
);

export default departmentRouter;

