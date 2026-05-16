import { Router } from "express";
import {
  createJeepney,
  deleteJeepney,
  getJeepneyById,
  getMyJeepney,
  listAdminJeepneys,
  listJeepneys,
  updateJeepney,
  updateMyJeepney,
} from "../controllers/jeepney.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createJeepneySchema,
  getJeepneyByIdSchema,
  listJeepneysSchema,
  updateJeepneySchema,
  updateMyJeepneySchema,
} from "../validators/jeepney.validator";

export const jeepneyRouter = Router();
export const adminJeepneyRouter = Router();
export const driverJeepneyRouter = Router();

jeepneyRouter.get("/", validate(listJeepneysSchema), listJeepneys);
jeepneyRouter.get("/:jeepneyId", validate(getJeepneyByIdSchema), getJeepneyById);

adminJeepneyRouter.use(requireAuth, requireRole("admin"));
adminJeepneyRouter.get("/", validate(listJeepneysSchema), listAdminJeepneys);
adminJeepneyRouter.post("/", validate(createJeepneySchema), createJeepney);
adminJeepneyRouter.patch("/:jeepneyId", validate(updateJeepneySchema), updateJeepney);
adminJeepneyRouter.delete("/:jeepneyId", validate(getJeepneyByIdSchema), deleteJeepney);

driverJeepneyRouter.use(requireAuth, requireRole("driver"));
driverJeepneyRouter.get("/me", getMyJeepney);
driverJeepneyRouter.patch("/me", validate(updateMyJeepneySchema), updateMyJeepney);
