import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { JeepneyModel } from "./jeepney.model";
import { RouteModel } from "./route.model";
import { ScheduleModel } from "./schedule.model";

test("Schedule model references Jeepney and Route", () => {
  const jeepneyPath = ScheduleModel.schema.path("jeepneyId");
  const routePath = ScheduleModel.schema.path("routeId");

  assert.equal(jeepneyPath.options.ref, "Jeepney");
  assert.equal(routePath.options.ref, "Route");
  assert.equal(jeepneyPath.options.required, true);
  assert.equal(routePath.options.required, true);
});

test("Schedule accepts valid jeepneyId and routeId object ids", () => {
  const route = new RouteModel({
    name: "Ayala Center Cebu -> IT Park",
    origin: "Ayala Center Cebu",
    destination: "IT Park",
    baseFare: 15,
    isActive: true,
  });

  const jeepney = new JeepneyModel({
    code: "JEEP-SCHED-001",
    plateNumber: "SCH-1234",
    routeId: route._id,
    driverId: new Types.ObjectId(),
    capacity: 20,
  });

  const schedule = new ScheduleModel({
    jeepneyId: jeepney._id,
    routeId: route._id,
    departureAt: new Date("2026-03-03T08:00:00.000Z"),
    arrivalAt: new Date("2026-03-03T09:00:00.000Z"),
  });

  const error = schedule.validateSync();
  assert.equal(error, undefined);
  assert.equal((schedule.jeepneyId as Types.ObjectId).toString(), (jeepney._id as Types.ObjectId).toString());
  assert.equal((schedule.routeId as Types.ObjectId).toString(), (route._id as Types.ObjectId).toString());
});
