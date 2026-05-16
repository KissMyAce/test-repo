import { Router } from "express";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { adminBookingRouter, bookingRouter, driverBookingRouter } from "./booking.routes";
import { adminJeepneyRouter, driverJeepneyRouter, jeepneyRouter } from "./jeepney.routes";
import { profileRouter } from "./profile.routes";
import { adminRouteRouter, routeRouter } from "./route.routes";
import { adminScheduleRouter, driverScheduleRouter, scheduleRouter } from "./schedule.routes";
import { uploadRouter } from "./upload.routes";

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
