import assert from "node:assert/strict";
import test from "node:test";
import {
  createBookingSchema,
  listAdminBookingsSchema,
  listDriverBookingsSchema,
  listMyBookingsSchema,
  updateAdminBookingSchema,
} from "./booking.validator";

const OBJECT_ID = "507f1f77bcf86cd799439011";
const OBJECT_ID_2 = "507f1f77bcf86cd799439012";

test("createBookingSchema accepts valid payload", () => {
  const parsed = createBookingSchema.parse({
    body: {
      scheduleId: OBJECT_ID,
      seats: 2,
    },
    params: {},
    query: {},
  });

  assert.equal(parsed.body.seats, 2);
});

test("createBookingSchema rejects invalid seats", () => {
  assert.throws(() =>
    createBookingSchema.parse({
      body: {
        scheduleId: OBJECT_ID,
        seats: 0,
      },
      params: {},
      query: {},
    })
  );
});

test("listMyBookingsSchema accepts filters", () => {
  const parsed = listMyBookingsSchema.parse({
    body: {},
    params: {},
    query: {
      status: "pending",
      scheduleId: OBJECT_ID_2,
      bookingRef: "BKG-TEST-123",
    },
  });

  assert.equal(parsed.query.status, "pending");
  assert.equal(parsed.query.scheduleId, OBJECT_ID_2);
});

test("updateAdminBookingSchema requires at least one field", () => {
  assert.throws(() =>
    updateAdminBookingSchema.parse({
      body: {},
      params: {
        bookingId: OBJECT_ID,
      },
      query: {},
    })
  );
});

test("listAdminBookingsSchema accepts status and date filters", () => {
  const parsed = listAdminBookingsSchema.parse({
    body: {},
    params: {},
    query: {
      status: "confirmed",
      from: "2026-03-01T00:00:00.000Z",
      to: "2026-03-03T00:00:00.000Z",
    },
  });

  assert.equal(parsed.query.status, "confirmed");
  assert.ok(parsed.query.from instanceof Date);
});

test("listDriverBookingsSchema accepts bookingRef filter", () => {
  const parsed = listDriverBookingsSchema.parse({
    body: {},
    params: {},
    query: {
      bookingRef: "BKG-TEST-456",
    },
  });

  assert.equal(parsed.query.bookingRef, "BKG-TEST-456");
});
