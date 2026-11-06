import { Router } from "express";
import { authRouter } from "../modules/auth/authRoutes.js";
import { hospitalRouter } from "../modules/hospital/hospitalRoutes.js";
import { departmentRouter } from "../modules/departments/departmentRoutes.js";
import { staffRouter } from "../modules/staff/staffRoutes.js";
import { patientRouter } from "../modules/patients/patientRoutes.js";
import { appointmentRouter } from "../modules/appointments/appointmentRoutes.js";
import { opdRouter } from "../modules/opd/opdRoutes.js";
import { ipdRouter } from "../modules/ipd/ipdRoutes.js";
import { laboratoryRouter } from "../modules/laboratory/laboratoryRoutes.js";
import { pharmacyRouter } from "../modules/pharmacy/pharmacyRoutes.js";
import { billingRouter } from "../modules/billing/billingRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/hospital", hospitalRouter);
apiRouter.use("/departments", departmentRouter);
apiRouter.use("/staff", staffRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/opd", opdRouter);
apiRouter.use("/ipd", ipdRouter);
apiRouter.use("/laboratory", laboratoryRouter);
apiRouter.use("/pharmacy", pharmacyRouter);
apiRouter.use("/billing", billingRouter);

apiRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "HMS API v1 root",
  });
});

export default apiRouter;
