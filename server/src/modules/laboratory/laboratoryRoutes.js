import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getLabTests,
  createLabTest,
  getLabOrders,
  createLabOrder,
  updateOrderStatus,
} from "./laboratoryController.js";

export const laboratoryRouter = Router();

laboratoryRouter.use(authenticate);

// Test Catalogue
laboratoryRouter.get("/tests", getLabTests);
laboratoryRouter.post(
  "/tests",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN"),
  createLabTest
);

// Lab Orders Workflow
laboratoryRouter.get("/", getLabOrders);
laboratoryRouter.post(
  "/",
  authorize("SUPER_ADMIN", "DOCTOR"),
  createLabOrder
);
laboratoryRouter.patch(
  "/:id/status",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "LAB_TECHNICIAN"),
  updateOrderStatus
);

export default laboratoryRouter;

