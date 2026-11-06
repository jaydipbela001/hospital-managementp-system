import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getMedicines,
  createMedicine,
  addStockBatch,
  getDispenses,
  dispenseMedicines,
} from "./pharmacyController.js";

export const pharmacyRouter = Router();

pharmacyRouter.use(authenticate);

// Medicine catalogue & inventory
pharmacyRouter.get("/medicines", getMedicines);
pharmacyRouter.post(
  "/medicines",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"),
  createMedicine
);
pharmacyRouter.post(
  "/medicines/:id/batches",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"),
  addStockBatch
);

// Dispensing workflow
pharmacyRouter.get("/", getDispenses);
pharmacyRouter.post(
  "/dispense",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "PHARMACIST"),
  dispenseMedicines
);

export default pharmacyRouter;

