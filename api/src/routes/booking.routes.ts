import { Router } from "express";
import {
  cancelMyBooking,
  createBooking,
  getMyBookingById,
  listAdminBookings,
  listDriverBookings,
  listMyBookings,
  updateAdminBooking,
} from "../controllers/booking.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  cancelMyBookingSchema,
  createBookingSchema,
  getMyBookingByIdSchema,
  listAdminBookingsSchema,
  listDriverBookingsSchema,
  listMyBookingsSchema,
  updateAdminBookingSchema,
} from "../validators/booking.validator";

export const bookingRouter = Router();
export const adminBookingRouter = Router();
export const driverBookingRouter = Router();

bookingRouter.use(requireAuth, requireRole("passenger"));
bookingRouter.post("/", validate(createBookingSchema), createBooking);
bookingRouter.get("/me", validate(listMyBookingsSchema), listMyBookings);
bookingRouter.get("/me/:bookingId", validate(getMyBookingByIdSchema), getMyBookingById);
bookingRouter.patch("/me/:bookingId/cancel", validate(cancelMyBookingSchema), cancelMyBooking);

adminBookingRouter.use(requireAuth, requireRole("admin"));
adminBookingRouter.get("/", validate(listAdminBookingsSchema), listAdminBookings);
adminBookingRouter.patch("/:bookingId", validate(updateAdminBookingSchema), updateAdminBooking);

driverBookingRouter.use(requireAuth, requireRole("driver"));
driverBookingRouter.get("/", validate(listDriverBookingsSchema), listDriverBookings);
