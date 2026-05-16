import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { JeepneyModel } from "./jeepney.model";

test("JeepneyModel applies defaults for status and photoKey", () => {
  const doc = new JeepneyModel({
    code: "JEEP-001",
    plateNumber: "ABC-1234",
    routeId: new Types.ObjectId(),
    driverId: new Types.ObjectId(),
    capacity: 20,
  });

  assert.equal(doc.status, "active");
  assert.equal(doc.photoKey, null);
});

test("JeepneyModel requires core fields", () => {
  const doc = new JeepneyModel({});
  const error = doc.validateSync();

  assert.ok(error);
  assert.ok(error.errors.code);
  assert.ok(error.errors.plateNumber);
  assert.ok(error.errors.routeId);
  assert.ok(error.errors.driverId);
  assert.equal(doc.capacity, 20);
});

test("JeepneyModel enforces status enum", () => {
  const doc = new JeepneyModel({
    code: "JEEP-002",
    plateNumber: "DEF-5678",
    routeId: new Types.ObjectId(),
    driverId: new Types.ObjectId(),
    capacity: 18,
    status: "archived",
  });

  const error = doc.validateSync();
  assert.ok(error);
  assert.ok(error.errors.status);
});

test("JeepneyModel enforces capacity range", () => {
  const doc = new JeepneyModel({
    code: "JEEP-003",
    plateNumber: "GHI-9012",
    routeId: new Types.ObjectId(),
    driverId: new Types.ObjectId(),
    capacity: 0,
  });

  const error = doc.validateSync();
  assert.ok(error);
  assert.ok(error.errors.capacity);
});
