import { Router } from "express";
import {
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  registerDriver,
  registerPassenger,
  resetPassword,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { authRateLimit } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerDriverSchema,
  registerPassengerSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

export const authRouter = Router();

authRouter.post("/register/passenger", authRateLimit, validate(registerPassengerSchema), registerPassenger);
authRouter.post("/register/driver", authRateLimit, validate(registerDriverSchema), registerDriver);
authRouter.post("/login", authRateLimit, validate(loginSchema), login);
authRouter.post("/refresh", validate(refreshSchema), refresh);
authRouter.post("/logout", requireAuth, logout);
authRouter.post("/logout-all", requireAuth, logoutAll);
authRouter.post("/forgot-password", authRateLimit, validate(forgotPasswordSchema), forgotPassword);
authRouter.post("/reset-password", authRateLimit, validate(resetPasswordSchema), resetPassword);
authRouter.get("/me", requireAuth, me);
