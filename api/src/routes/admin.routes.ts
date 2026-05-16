import { Router } from "express";
import {
  approveDriver,
  listApprovedDrivers,
  listPendingDrivers,
  rejectDriver,
} from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { approveDriverSchema, rejectDriverSchema } from "../validators/admin.validator";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/drivers/approved", listApprovedDrivers);
adminRouter.get("/drivers/pending", listPendingDrivers);
adminRouter.patch("/drivers/:userId/approve", validate(approveDriverSchema), approveDriver);
adminRouter.patch("/drivers/:userId/reject", validate(rejectDriverSchema), rejectDriver);
