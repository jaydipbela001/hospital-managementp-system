import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { getDepartments } from "./departmentController.js";

export const departmentRouter = Router();

departmentRouter.use(authenticate);

departmentRouter.get("/", getDepartments);

export default departmentRouter;

