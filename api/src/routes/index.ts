import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { authRouter } from "./auth.routes.js";
import { adminBookingRouter, bookingRouter, driverBookingRouter } from "./booking.routes.js";
import { adminJeepneyRouter, driverJeepneyRouter, jeepneyRouter } from "./jeepney.routes.js";
import { profileRouter } from "./profile.routes.js";
import { adminRouteRouter, routeRouter } from "./route.routes.js";
import { adminScheduleRouter, driverScheduleRouter, scheduleRouter } from "./schedule.routes.js";
import { uploadRouter } from "./upload.routes.js";

export const apiV1Router = Router();

apiV1Router.use("/auth", authRouter);
apiV1Router.use("/profile", profileRouter);
apiV1Router.use("/admin", adminRouter);
apiV1Router.use("/admin/routes", adminRouteRouter);
apiV1Router.use("/admin/jeepneys", adminJeepneyRouter);
apiV1Router.use("/admin/schedules", adminScheduleRouter);
apiV1Router.use("/admin/bookings", adminBookingRouter);
apiV1Router.use("/driver/jeepney", driverJeepneyRouter);
apiV1Router.use("/driver/schedules", driverScheduleRouter);
apiV1Router.use("/driver/bookings", driverBookingRouter);
apiV1Router.use("/bookings", bookingRouter);
apiV1Router.use("/routes", routeRouter);
apiV1Router.use("/jeepneys", jeepneyRouter);
apiV1Router.use("/schedules", scheduleRouter);
apiV1Router.use("/uploads", uploadRouter);
