import { connectDb } from "../config/db";
import { JeepneyModel, RouteModel, ScheduleModel } from "../models";

const run = async () => {
  await connectDb();

  const [schedulesResult, jeepneysResult, routesResult] = await Promise.all([
    ScheduleModel.deleteMany({}),
    JeepneyModel.deleteMany({}),
    RouteModel.deleteMany({}),
  ]);

  // eslint-disable-next-line no-console
  console.log("Transport data cleared", {
    deleted: {
      schedules: schedulesResult.deletedCount || 0,
      jeepneys: jeepneysResult.deletedCount || 0,
      routes: routesResult.deletedCount || 0,
    },
  });
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to clear transport data:", error);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
