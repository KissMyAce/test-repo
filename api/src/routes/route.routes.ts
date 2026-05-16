import { Router } from "express";
import {
  createRoute,
  deleteRoute,
  getRouteById,
  listRoutes,
  updateRoute,
} from "../controllers/route.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createRouteSchema,
  getRouteByIdSchema,
  listRoutesSchema,
  updateRouteSchema,
} from "../validators/route.validator";

export const routeRouter = Router();
export const adminRouteRouter = Router();

routeRouter.get("/", validate(listRoutesSchema), listRoutes);
routeRouter.get("/:routeId", validate(getRouteByIdSchema), getRouteById);

adminRouteRouter.use(requireAuth, requireRole("admin"));
adminRouteRouter.post("/", validate(createRouteSchema), createRoute);
adminRouteRouter.patch("/:routeId", validate(updateRouteSchema), updateRoute);
adminRouteRouter.delete("/:routeId", validate(getRouteByIdSchema), deleteRoute);

