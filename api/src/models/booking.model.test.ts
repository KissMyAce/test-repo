import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { BookingModel } from "./booking.model";

test("BookingModel applies default status", () => {
  const doc = new BookingModel({
    bookingRef: "BKG-TEST-001",
    passengerId: new Types.ObjectId(),
    scheduleId: new Types.ObjectId(),
    routeSnapshot: {
      name: "Ayala Center Cebu -> IT Park",
      origin: "Ayala Center Cebu",
      destination: "IT Park",
    },
    jeepneySnapshot: {
      code: "JEEP-001",
      plateNumber: "ABC-1234",
      capacity: 20,
    },
    seats: 2,
    unitFare: 15,
    totalFare: 30,
  });

  assert.equal(doc.status, "pending");
});

test("BookingModel validates totalFare consistency", () => {
  const doc = new BookingModel({
    bookingRef: "BKG-TEST-002",
    passengerId: new Types.ObjectId(),
    scheduleId: new Types.ObjectId(),
    routeSnapshot: {
      name: "Ayala Center Cebu -> IT Park",
      origin: "Ayala Center Cebu",
      destination: "IT Park",
    },
    jeepneySnapshot: {
      code: "JEEP-001",
      plateNumber: "ABC-1234",
      capacity: 20,
    },
    seats: 2,
    unitFare: 15,
    totalFare: 40,
  });

  const error = doc.validateSync();
  assert.ok(error);
  assert.ok(error.errors.totalFare);
});
