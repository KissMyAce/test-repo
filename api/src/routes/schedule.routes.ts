import { Router } from "express";
import {
  createMySchedule,
  createSchedule,
  deleteMySchedule,
  deleteSchedule,
  getScheduleById,
  listAdminSchedules,
  listMySchedules,
  listSchedules,
  updateMySchedule,
  updateSchedule,
} from "../controllers/schedule.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createMyScheduleSchema,
  createScheduleSchema,
  getScheduleByIdSchema,
  listSchedulesSchema,
  updateMyScheduleSchema,
  updateScheduleSchema,
} from "../validators/schedule.validator";

export const scheduleRouter = Router();
export const adminScheduleRouter = Router();
export const driverScheduleRouter = Router();

scheduleRouter.get("/", validate(listSchedulesSchema), listSchedules);
scheduleRouter.get("/:scheduleId", validate(getScheduleByIdSchema), getScheduleById);

adminScheduleRouter.use(requireAuth, requireRole("admin"));
adminScheduleRouter.get("/", validate(listSchedulesSchema), listAdminSchedules);
adminScheduleRouter.post("/", validate(createScheduleSchema), createSchedule);
adminScheduleRouter.patch("/:scheduleId", validate(updateScheduleSchema), updateSchedule);
adminScheduleRouter.delete("/:scheduleId", validate(getScheduleByIdSchema), deleteSchedule);

driverScheduleRouter.use(requireAuth, requireRole("driver"));
driverScheduleRouter.get("/me", validate(listSchedulesSchema), listMySchedules);
driverScheduleRouter.post("/me", validate(createMyScheduleSchema), createMySchedule);
driverScheduleRouter.patch("/me/:scheduleId", validate(updateMyScheduleSchema), updateMySchedule);
driverScheduleRouter.delete("/me/:scheduleId", validate(getScheduleByIdSchema), deleteMySchedule);
