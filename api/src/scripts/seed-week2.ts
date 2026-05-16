import { connectDb } from "../config/db";
import { DriverProfileModel, JeepneyModel, RouteModel, ScheduleModel, UserModel } from "../models";
import { hashPassword } from "../utils/password";

const DEFAULT_PASSWORD = "qweasd123";

const TEST_USERS = [
  { email: "admin@gmail.com", name: "System Admin", role: "admin", status: "active", phone: "09170000001" },
  { email: "driver1@gmail.com", name: "Juan Dela Cruz", role: "driver", status: "active", phone: "09170000002" },
  { email: "driver2@gmail.com", name: "Maria Santos", role: "driver", status: "active", phone: "09170000003" },
  { email: "driver3@gmail.com", name: "Carlo Reyes", role: "driver", status: "active", phone: "09170000006" },
  { email: "driver4@gmail.com", name: "Paolo Garcia", role: "driver", status: "active", phone: "09170000007" },
  { email: "passenger1@gmail.com", name: "Ana Mendoza", role: "passenger", status: "active", phone: "09170000004" },
  { email: "passenger2@gmail.com", name: "Leo Lim", role: "passenger", status: "active", phone: "09170000005" },
] as const;

const DRIVER_PROFILES = [
  {
    email: "driver1@gmail.com",
    licenseNumber: "CEB-DRV-0001",
    licenseFileKey: "driver-docs/driver1/license.pdf",
    nbiFileKey: "driver-docs/driver1/nbi.pdf",
  },
  {
    email: "driver2@gmail.com",
    licenseNumber: "CEB-DRV-0002",
    licenseFileKey: "driver-docs/driver2/license.pdf",
    nbiFileKey: "driver-docs/driver2/nbi.pdf",
  },
  {
    email: "driver3@gmail.com",
    licenseNumber: "CEB-DRV-0003",
    licenseFileKey: "driver-docs/driver3/license.pdf",
    nbiFileKey: "driver-docs/driver3/nbi.pdf",
  },
  {
    email: "driver4@gmail.com",
    licenseNumber: "CEB-DRV-0004",
    licenseFileKey: "driver-docs/driver4/license.pdf",
    nbiFileKey: "driver-docs/driver4/nbi.pdf",
  },
] as const;

const ROUTES = [
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

const JEEPNEYS = [
  {
    code: "JEEP-CEB-101",
    plateNumber: "GAB-2101",
    routeName: "Ayala Center Cebu -> IT Park",
    driverEmail: "driver1@gmail.com",
    capacity: 22,
  },
  {
    code: "JEEP-CEB-102",
    plateNumber: "GAB-2102",
    routeName: "SM City Cebu -> Colon",
    driverEmail: "driver2@gmail.com",
    capacity: 20,
  },
  {
    code: "JEEP-CEB-103",
    plateNumber: "GAB-2103",
    routeName: "Parkmall Mandaue -> Ayala Center Cebu",
    driverEmail: "driver3@gmail.com",
    capacity: 18,
  },
] as const;

const run = async () => {
  await connectDb();

  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  for (const user of TEST_USERS) {
    await UserModel.updateOne(
      { email: user.email },
      {
        $set: {
          name: user.name,
          role: user.role,
          status: user.status,
          phone: user.phone,
          passwordHash,
        },
        $setOnInsert: {
          profileImageKey: null,
        },
      },
      { upsert: true }
    );
  }

  const users = await UserModel.find({ email: { $in: TEST_USERS.map((user) => user.email) } })
    .select("_id email role")
    .lean();

  const userByEmail = new Map(users.map((user) => [user.email, user]));

  for (const profile of DRIVER_PROFILES) {
    const driver = userByEmail.get(profile.email);
    if (!driver) continue;

    await DriverProfileModel.updateOne(
      { userId: driver._id },
      {
        $set: {
          licenseNumber: profile.licenseNumber,
          licenseFileKey: profile.licenseFileKey,
          nbiFileKey: profile.nbiFileKey,
          approvalStatus: "approved",
          reviewedBy: userByEmail.get("admin@gmail.com")?._id || null,
          reviewNotes: "Seeded approved driver",
        },
      },
      { upsert: true }
    );
  }

  for (const route of ROUTES) {
    await RouteModel.updateOne(
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
    );
  }

  const routes = await RouteModel.find({ name: { $in: ROUTES.map((route) => route.name) } })
    .select("_id name")
    .lean();
  const routeByName = new Map(routes.map((route) => [route.name, route]));

  for (const jeepney of JEEPNEYS) {
    const route = routeByName.get(jeepney.routeName);
    const driver = userByEmail.get(jeepney.driverEmail);
    if (!route || !driver) continue;

    await JeepneyModel.updateOne(
      { code: jeepney.code },
      {
        $set: {
          plateNumber: jeepney.plateNumber,
          routeId: route._id,
          driverId: driver._id,
          capacity: jeepney.capacity,
          status: "active",
          photoKey: null,
        },
      },
      { upsert: true }
    );
  }

  const jeepneys = await JeepneyModel.find({ code: { $in: JEEPNEYS.map((jeepney) => jeepney.code) } })
    .select("_id code routeId")
    .lean();

  const jeepneyByCode = new Map(jeepneys.map((jeepney) => [jeepney.code, jeepney]));

  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);

  const scheduleTemplates = [
    { jeepneyCode: "JEEP-CEB-101", dayOffset: 1, departureHour: 7, travelMinutes: 40 },
    { jeepneyCode: "JEEP-CEB-102", dayOffset: 1, departureHour: 9, travelMinutes: 55 },
    { jeepneyCode: "JEEP-CEB-103", dayOffset: 1, departureHour: 11, travelMinutes: 45 },
    { jeepneyCode: "JEEP-CEB-101", dayOffset: 2, departureHour: 8, travelMinutes: 40 },
    { jeepneyCode: "JEEP-CEB-102", dayOffset: 2, departureHour: 10, travelMinutes: 55 },
    { jeepneyCode: "JEEP-CEB-103", dayOffset: 2, departureHour: 12, travelMinutes: 45 },
    { jeepneyCode: "JEEP-CEB-101", dayOffset: 3, departureHour: 7, travelMinutes: 40 },
    { jeepneyCode: "JEEP-CEB-102", dayOffset: 3, departureHour: 9, travelMinutes: 55 },
    { jeepneyCode: "JEEP-CEB-103", dayOffset: 3, departureHour: 11, travelMinutes: 45 },
  ] as const;

  for (const template of scheduleTemplates) {
    const jeepney = jeepneyByCode.get(template.jeepneyCode);
    if (!jeepney) continue;

    const departureAt = new Date(startDay);
    departureAt.setDate(startDay.getDate() + template.dayOffset);
    departureAt.setHours(template.departureHour, 0, 0, 0);

    const arrivalAt = new Date(departureAt);
    arrivalAt.setMinutes(arrivalAt.getMinutes() + template.travelMinutes);

    await ScheduleModel.updateOne(
      {
        jeepneyId: jeepney._id,
        routeId: jeepney.routeId,
        departureAt,
      },
      {
        $set: {
          arrivalAt,
          status: "scheduled",
        },
      },
      { upsert: true }
    );
  }

  const seededSchedules = await ScheduleModel.find({
    departureAt: { $gte: startDay },
    jeepneyId: { $in: jeepneys.map((jeepney) => jeepney._id) },
  })
    .sort({ departureAt: 1 })
    .select("jeepneyId routeId departureAt arrivalAt status")
    .lean();

  // eslint-disable-next-line no-console
  console.log("Week 2 seed complete", {
    credentials: {
      password: DEFAULT_PASSWORD,
      admin: ["admin@gmail.com"],
      drivers: ["driver1@gmail.com", "driver2@gmail.com", "driver3@gmail.com", "driver4@gmail.com"],
      passengers: ["passenger1@gmail.com", "passenger2@gmail.com"],
    },
    totals: {
      users: users.length,
      routes: routes.length,
      jeepneys: jeepneys.length,
      schedules: seededSchedules.length,
    },
  });
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to seed week 2 data:", error);
    process.exit(1);
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
