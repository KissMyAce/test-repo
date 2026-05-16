import assert from "node:assert/strict";
import test from "node:test";
import {
  createJeepneySchema,
  listJeepneysSchema,
  updateJeepneySchema,
  updateMyJeepneySchema,
} from "./jeepney.validator";

const OBJECT_ID = "507f1f77bcf86cd799439011";
const OBJECT_ID_2 = "507f1f77bcf86cd799439012";

test("createJeepneySchema accepts valid payload", () => {
  const parsed = createJeepneySchema.parse({
    body: {
      code: "JEEP-001",
      plateNumber: "ABC-1234",
      routeId: OBJECT_ID,
      driverId: OBJECT_ID_2,
      capacity: 20,
      status: "active",
      photoKey: "jeepneys/JEEP-001/photo.jpg",
    },
    params: {},
    query: {},
  });

  assert.equal(parsed.body.code, "JEEP-001");
  assert.equal(parsed.body.capacity, 20);
});

test("createJeepneySchema rejects invalid capacity", () => {
  assert.throws(() =>
    createJeepneySchema.parse({
      body: {
        code: "JEEP-001",
        plateNumber: "ABC-1234",
        routeId: "route-id",
        driverId: "driver-id",
        capacity: 0,
      },
      params: {},
      query: {},
    })
  );
});

test("updateJeepneySchema requires at least one field", () => {
  assert.throws(() =>
    updateJeepneySchema.parse({
      body: {},
      params: { jeepneyId: "jeepney-1" },
      query: {},
    })
  );
});

test("updateMyJeepneySchema allows partial updates", () => {
  const parsed = updateMyJeepneySchema.parse({
    body: {
      photoKey: null,
    },
    params: {},
    query: {},
  });

  assert.equal(parsed.body.photoKey, null);
});

test("listJeepneysSchema accepts query filters", () => {
  const parsed = listJeepneysSchema.parse({
    body: {},
    params: {},
    query: {
      search: "ayala",
      status: "active",
      routeId: OBJECT_ID,
      driverId: OBJECT_ID_2,
    },
  });

  assert.equal(parsed.query.status, "active");
  assert.equal(parsed.query.search, "ayala");
});
