import { Router } from "express";
import {
  approveDriver,
  createAdminUser,
  deleteAdminUser,
  getDriverDocumentUrl,
  listAdminUsers,
  listApprovedDrivers,
  listPendingDrivers,
  rejectDriver,
  updateAdminUser,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  approveDriverSchema,
  createAdminUserSchema,
  deleteAdminUserSchema,
  getDriverDocumentUrlSchema,
  listAdminUsersSchema,
  rejectDriverSchema,
  updateAdminUserSchema,
} from "../validators/admin.validator.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/users", validate(listAdminUsersSchema), listAdminUsers);
adminRouter.post("/users", validate(createAdminUserSchema), createAdminUser);
adminRouter.patch("/users/:userId", validate(updateAdminUserSchema), updateAdminUser);
adminRouter.delete("/users/:userId", validate(deleteAdminUserSchema), deleteAdminUser);
adminRouter.get("/driver-doc-url", validate(getDriverDocumentUrlSchema), getDriverDocumentUrl);

adminRouter.get("/drivers/approved", listApprovedDrivers);
adminRouter.get("/drivers/pending", listPendingDrivers);
adminRouter.patch("/drivers/:userId/approve", validate(approveDriverSchema), approveDriver);
adminRouter.patch("/drivers/:userId/reject", validate(rejectDriverSchema), rejectDriver);
