import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import {
  getInvoices,
  createInvoice,
  getInvoiceById,
  recordPayment,
} from "./billingController.js";

export const billingRouter = Router();

billingRouter.use(authenticate);

billingRouter.get(
  "/invoices",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"),
  getInvoices
);

billingRouter.post(
  "/invoices",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST"),
  createInvoice
);

billingRouter.get(
  "/invoices/:id",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST", "DOCTOR", "PATIENT"),
  getInvoiceById
);

billingRouter.post(
  "/invoices/:id/payments",
  authorize("SUPER_ADMIN", "HOSPITAL_ADMIN", "RECEPTIONIST"),
  recordPayment
);

export default billingRouter;

