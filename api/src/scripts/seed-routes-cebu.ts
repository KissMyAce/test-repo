import { connectDb } from "../config/db";
import { RouteModel } from "../models";

const CEBU_ROUTES = [
  {
    name: "Ayala Center Cebu -> IT Park",
    origin: "Ayala Center Cebu",
    destination: "IT Park",
    baseFare: 15,
  },
  {
    name: "SM City Cebu -> Colon",
    origin: "SM City Cebu",
    destination: "Colon",
    baseFare: 15,
  },
  {
    name: "Parkmall Mandaue -> Ayala Center Cebu",
    origin: "Parkmall Mandaue",
    destination: "Ayala Center Cebu",
    baseFare: 18,
  },
  {
    name: "Talamban -> Fuente Osmena",
    origin: "Talamban",
    destination: "Fuente Osmena",
    baseFare: 18,
  },
  {
    name: "Colon -> Carbon",
    origin: "Colon",
    destination: "Carbon",
    baseFare: 13,
  },
] as const;

const run = async () => {
  await connectDb();

  const operations = CEBU_ROUTES.map((route) =>
    RouteModel.updateOne(
      { name: route.name },
      {
        $set: {
          origin: route.origin,
          destination: route.destination,
          baseFare: route.baseFare,
          isActive: true,
        },
      },
      { upsert: true }
    )
  );

  await Promise.all(operations);

  const routes = await RouteModel.find({
    name: { $in: CEBU_ROUTES.map((route) => route.name) },
  })
    .sort({ name: 1 })
    .select("name origin destination baseFare isActive")
    .lean();

  // eslint-disable-next-line no-console
  console.log("Cebu routes seeded:", routes);
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to seed Cebu routes:", error);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });

