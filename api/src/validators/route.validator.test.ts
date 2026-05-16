import assert from "node:assert/strict";
import test from "node:test";
import { getRouteByIdSchema, updateRouteSchema } from "./route.validator";

const OBJECT_ID = "507f1f77bcf86cd799439011";

test("getRouteByIdSchema accepts valid object id", () => {
  const parsed = getRouteByIdSchema.parse({
    body: {},
    params: { routeId: OBJECT_ID },
    query: {},
  });

  assert.equal(parsed.params.routeId, OBJECT_ID);
});

test("getRouteByIdSchema rejects invalid object id", () => {
  assert.throws(() =>
    getRouteByIdSchema.parse({
      body: {},
      params: { routeId: "route-1" },
      query: {},
    })
  );
});

test("updateRouteSchema requires at least one field", () => {
  assert.throws(() =>
    updateRouteSchema.parse({
      body: {},
      params: { routeId: OBJECT_ID },
      query: {},
    })
  );
});
