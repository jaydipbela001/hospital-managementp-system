import { Router } from "express";
import { login, logout, getMe, registerPatient } from "./authController.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authLimiter } from "../../middleware/rateLimit.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, registerPatient);
authRouter.post("/login", authLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, getMe);

export default authRouter;

