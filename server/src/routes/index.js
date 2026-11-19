import { Router } from "express";
import { authRouter } from "../modules/auth/authRoutes.js";
import { staffRouter } from "../modules/staff/staffRoutes.js";
import { patientRouter } from "../modules/patients/patientRoutes.js";
import { appointmentRouter } from "../modules/appointments/appointmentRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/staff", staffRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/appointments", appointmentRouter);

apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "HMS Core API (Patient, Doctor, Receptionist) running",
  });
});

export default apiRouter;
