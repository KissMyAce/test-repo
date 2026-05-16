import assert from "node:assert/strict";
import test from "node:test";
import {
  createMyScheduleSchema,
  createScheduleSchema,
  listSchedulesSchema,
  updateMyScheduleSchema,
  updateScheduleSchema,
} from "./schedule.validator";

const OBJECT_ID = "507f1f77bcf86cd799439011";
const OBJECT_ID_2 = "507f1f77bcf86cd799439012";

test("createScheduleSchema accepts valid payload", () => {
  const parsed = createScheduleSchema.parse({
    body: {
      jeepneyId: OBJECT_ID,
      routeId: OBJECT_ID_2,
      departureAt: "2026-03-03T08:00:00.000Z",
      arrivalAt: "2026-03-03T09:00:00.000Z",
      status: "scheduled",
    },
    params: {},
    query: {},
  });

  assert.equal(parsed.body.status, "scheduled");
  assert.ok(parsed.body.departureAt instanceof Date);
});

test("createScheduleSchema rejects invalid time range", () => {
  assert.throws(() =>
    createScheduleSchema.parse({
      body: {
        jeepneyId: OBJECT_ID,
        routeId: OBJECT_ID_2,
        departureAt: "2026-03-03T10:00:00.000Z",
        arrivalAt: "2026-03-03T09:00:00.000Z",
      },
      params: {},
      query: {},
    })
  );
});

test("updateScheduleSchema requires at least one field", () => {
  assert.throws(() =>
    updateScheduleSchema.parse({
      body: {},
      params: { scheduleId: OBJECT_ID },
      query: {},
    })
  );
});

test("createMyScheduleSchema allows driver payload without jeepneyId", () => {
  const parsed = createMyScheduleSchema.parse({
    body: {
      routeId: OBJECT_ID_2,
      departureAt: "2026-03-03T08:00:00.000Z",
      arrivalAt: "2026-03-03T09:00:00.000Z",
    },
    params: {},
    query: {},
  });

  assert.equal(parsed.body.routeId, OBJECT_ID_2);
});

test("updateMyScheduleSchema allows partial updates", () => {
  const parsed = updateMyScheduleSchema.parse({
    body: {
      status: "cancelled",
    },
    params: { scheduleId: OBJECT_ID },
    query: {},
  });

  assert.equal(parsed.body.status, "cancelled");
});

test("listSchedulesSchema accepts route/date/status filters", () => {
  const parsed = listSchedulesSchema.parse({
    body: {},
    params: {},
    query: {
      routeId: OBJECT_ID_2,
      status: "scheduled",
      date: "2026-03-03",
    },
  });

  assert.equal(parsed.query.status, "scheduled");
  assert.equal(parsed.query.date, "2026-03-03");
});
