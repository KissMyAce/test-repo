import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { ScheduleModel } from "./schedule.model";

test("ScheduleModel applies default status", () => {
  const doc = new ScheduleModel({
    jeepneyId: new Types.ObjectId(),
    routeId: new Types.ObjectId(),
    departureAt: new Date("2026-03-02T01:00:00.000Z"),
    arrivalAt: new Date("2026-03-02T02:00:00.000Z"),
  });

  assert.equal(doc.status, "scheduled");
});

test("ScheduleModel requires core fields", () => {
  const doc = new ScheduleModel({});
  const error = doc.validateSync();

  assert.ok(error);
  assert.ok(error.errors.jeepneyId);
  assert.ok(error.errors.routeId);
  assert.ok(error.errors.departureAt);
  assert.ok(error.errors.arrivalAt);
});

test("ScheduleModel enforces status enum", () => {
  const doc = new ScheduleModel({
    jeepneyId: new Types.ObjectId(),
    routeId: new Types.ObjectId(),
    departureAt: new Date("2026-03-02T01:00:00.000Z"),
    arrivalAt: new Date("2026-03-02T02:00:00.000Z"),
    status: "paused",
  });

  const error = doc.validateSync();
  assert.ok(error);
  assert.ok(error.errors.status);
});

test("ScheduleModel enforces arrivalAt later than departureAt", () => {
  const doc = new ScheduleModel({
    jeepneyId: new Types.ObjectId(),
    routeId: new Types.ObjectId(),
    departureAt: new Date("2026-03-02T05:00:00.000Z"),
    arrivalAt: new Date("2026-03-02T04:00:00.000Z"),
  });

  const error = doc.validateSync();
  assert.ok(error);
  assert.ok(error.errors.arrivalAt);
});
