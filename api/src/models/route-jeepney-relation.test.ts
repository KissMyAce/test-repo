import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { JeepneyModel } from "./jeepney.model";
import { RouteModel } from "./route.model";

test("Jeepney routeId references Route model", () => {
  const routePath = JeepneyModel.schema.path("routeId");
  const driverPath = JeepneyModel.schema.path("driverId");

  assert.equal(routePath.options.ref, "Route");
  assert.equal(driverPath.options.ref, "User");
  assert.equal(routePath.options.required, true);
  assert.equal(driverPath.options.required, true);
});

test("Jeepney can hold a valid Route _id as routeId", () => {
  const route = new RouteModel({
    name: "Ayala Center Cebu -> IT Park",
    origin: "Ayala Center Cebu",
    destination: "IT Park",
    baseFare: 15,
    isActive: true,
  });

  const routeId = route._id as Types.ObjectId;

  const jeepney = new JeepneyModel({
    code: "JEEP-REL-001",
    plateNumber: "REL-1234",
    routeId,
    driverId: new Types.ObjectId(),
    capacity: 20,
  });

  const error = jeepney.validateSync();
  assert.equal(error, undefined);
  assert.equal((jeepney.routeId as Types.ObjectId).toString(), routeId.toString());
});

test("Jeepney routeId is required for relation integrity", () => {
  const jeepney = new JeepneyModel({
    code: "JEEP-REL-002",
    plateNumber: "REL-5678",
    driverId: new Types.ObjectId(),
    capacity: 18,
  });

  const error = jeepney.validateSync();
  assert.ok(error);
  assert.ok(error.errors.routeId);
});

test("Jeepney routeId must be a valid ObjectId", () => {
  const jeepney = new JeepneyModel({
    code: "JEEP-REL-003",
    plateNumber: "REL-9012",
    routeId: "not-a-valid-object-id",
    driverId: new Types.ObjectId(),
    capacity: 18,
  });

  const error = jeepney.validateSync();
  assert.ok(error);
  assert.ok(error.errors.routeId);
});

