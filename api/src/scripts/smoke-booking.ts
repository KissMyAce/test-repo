const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000/api/v1";
const PASSWORD = process.env.SEED_TEST_PASSWORD || "qweasd123";

const ACCOUNTS = {
  admin: { email: "admin@gmail.com", password: PASSWORD },
  driver4: { email: "driver4@gmail.com", password: PASSWORD },
  passenger1: { email: "passenger1@gmail.com", password: PASSWORD },
} as const;

type LoginPayload = {
  accessToken?: string;
  user?: {
    id?: string;
    role?: string;
    email?: string;
  };
};

type CaseResult = {
  name: string;
  ok: boolean;
  details: string;
};

const request = async <T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string;
    body?: unknown;
  }
) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options?.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  return { response, payload: payload as T };
};

const expectStatus = async (
  name: string,
  run: () => Promise<{ response: Response; payload: unknown }>,
  expectedStatuses: number[],
  assertPayload?: (payload: unknown) => void
): Promise<CaseResult> => {
  try {
    const { response, payload } = await run();
    if (!expectedStatuses.includes(response.status)) {
      return {
        name,
        ok: false,
        details: `Expected ${expectedStatuses.join("/")} but got ${response.status}. Payload: ${JSON.stringify(payload)}`,
      };
    }

    if (assertPayload) {
      assertPayload(payload);
    }

    return { name, ok: true, details: `Status ${response.status}` };
  } catch (error) {
    return { name, ok: false, details: `Request/assertion failed: ${String(error)}` };
  }
};

const login = async (email: string, password: string) => {
  const { response, payload } = await request<LoginPayload>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (response.status !== 200 || !payload.accessToken) {
    throw new Error(`Login failed for ${email}. Status ${response.status}`);
  }
  return payload;
};

const run = async () => {
  const results: CaseResult[] = [];

  const admin = await login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  const driver = await login(ACCOUNTS.driver4.email, ACCOUNTS.driver4.password);
  const passenger = await login(ACCOUNTS.passenger1.email, ACCOUNTS.passenger1.password);

  const smokeId = Date.now();
  const routeName = `Booking Smoke Route ${smokeId}`;
  const jeepCode = `BKG-SMOKE-JEEP-${smokeId}`;
  const plateNumber = `BSM-${String(smokeId).slice(-4)}`;

  let createdRouteId = "";
  let createdJeepneyId = "";
  let createdScheduleId = "";
  let bookingOneId = "";
  let bookingTwoId = "";

  results.push(
    await expectStatus(
      "admin create route",
      () =>
        request<{ route?: { id?: string } }>("/admin/routes", {
          method: "POST",
          token: admin.accessToken,
          body: {
            name: routeName,
            origin: "Cebu IT Park",
            destination: "Ayala Center Cebu",
            baseFare: 20,
            isActive: true,
          },
        }).then((res) => {
          createdRouteId = res.payload?.route?.id || "";
          return res;
        }),
      [201]
    )
  );

  results.push(
    await expectStatus(
      "admin create jeepney",
      () =>
        request<{ jeepney?: { id?: string } }>("/admin/jeepneys", {
          method: "POST",
          token: admin.accessToken,
          body: {
            code: jeepCode,
            plateNumber,
            routeId: createdRouteId,
            driverId: driver.user?.id,
            capacity: 3,
            status: "active",
          },
        }).then((res) => {
          createdJeepneyId = res.payload?.jeepney?.id || "";
          return res;
        }),
      [201]
    )
  );

  const departureAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  departureAt.setHours(9, 0, 0, 0);
  const arrivalAt = new Date(departureAt);
  arrivalAt.setMinutes(arrivalAt.getMinutes() + 45);

  results.push(
    await expectStatus(
      "admin create schedule",
      () =>
        request<{ schedule?: { id?: string } }>("/admin/schedules", {
          method: "POST",
          token: admin.accessToken,
          body: {
            jeepneyId: createdJeepneyId,
            routeId: createdRouteId,
            departureAt: departureAt.toISOString(),
            arrivalAt: arrivalAt.toISOString(),
            status: "scheduled",
          },
        }).then((res) => {
          createdScheduleId = res.payload?.schedule?.id || "";
          return res;
        }),
      [201]
    )
  );

  results.push(
    await expectStatus(
      "passenger create booking #1 (2 seats)",
      () =>
        request<{ booking?: { id?: string; status?: string } }>("/bookings", {
          method: "POST",
          token: passenger.accessToken,
          body: {
            scheduleId: createdScheduleId,
            seats: 2,
          },
        }).then((res) => {
          bookingOneId = res.payload?.booking?.id || "";
          return res;
        }),
      [201],
      (payload) => {
        const booking = (payload as { booking?: { status?: string } })?.booking;
        if (booking?.status !== "pending") {
          throw new Error("Expected booking status to be pending after create");
        }
      }
    )
  );

  results.push(
    await expectStatus(
      "passenger create booking #2 over-capacity rejected",
      () =>
        request("/bookings", {
          method: "POST",
          token: passenger.accessToken,
          body: {
            scheduleId: createdScheduleId,
            seats: 2,
          },
        }),
      [409]
    )
  );

  results.push(
    await expectStatus(
      "admin confirms booking #1",
      () =>
        request<{ booking?: { status?: string } }>(`/admin/bookings/${bookingOneId}`, {
          method: "PATCH",
          token: admin.accessToken,
          body: { status: "confirmed" },
        }),
      [200],
      (payload) => {
        const booking = (payload as { booking?: { status?: string } })?.booking;
        if (booking?.status !== "confirmed") {
          throw new Error("Expected booking status to be confirmed");
        }
      }
    )
  );

  results.push(
    await expectStatus(
      "schedule availability reflects confirmed seats",
      () => request<{ schedule?: { availableSeats?: number; confirmedBookingsCount?: number } }>(`/schedules/${createdScheduleId}`),
      [200],
      (payload) => {
        const schedule = (payload as { schedule?: { availableSeats?: number; confirmedBookingsCount?: number } })?.schedule;
        if (!schedule) throw new Error("Missing schedule payload");
        if (schedule.availableSeats !== 1) throw new Error(`Expected availableSeats=1 got ${schedule.availableSeats}`);
        if (schedule.confirmedBookingsCount !== 2) {
          throw new Error(`Expected confirmedBookingsCount=2 got ${schedule.confirmedBookingsCount}`);
        }
      }
    )
  );

  results.push(
    await expectStatus(
      "driver sees booking on own schedule",
      () => request<{ bookings?: Array<{ id?: string }> }>("/driver/bookings", { token: driver.accessToken }),
      [200],
      (payload) => {
        const bookings = (payload as { bookings?: Array<{ id?: string }> })?.bookings || [];
        const found = bookings.some((booking) => booking.id === bookingOneId);
        if (!found) throw new Error("Expected driver booking list to include created booking");
      }
    )
  );

  results.push(
    await expectStatus(
      "passenger cannot access admin bookings list",
      () => request("/admin/bookings", { token: passenger.accessToken }),
      [403]
    )
  );

  results.push(
    await expectStatus(
      "passenger creates booking #2 (1 seat) after remaining capacity",
      () =>
        request<{ booking?: { id?: string; status?: string } }>("/bookings", {
          method: "POST",
          token: passenger.accessToken,
          body: {
            scheduleId: createdScheduleId,
            seats: 1,
          },
        }).then((res) => {
          bookingTwoId = res.payload?.booking?.id || "";
          return res;
        }),
      [201]
    )
  );

  results.push(
    await expectStatus(
      "passenger cancels booking #2",
      () =>
        request<{ booking?: { status?: string } }>(`/bookings/me/${bookingTwoId}/cancel`, {
          method: "PATCH",
          token: passenger.accessToken,
          body: { reason: "Change of plan" },
        }),
      [200],
      (payload) => {
        const booking = (payload as { booking?: { status?: string } })?.booking;
        if (booking?.status !== "cancelled") {
          throw new Error("Expected booking status to be cancelled");
        }
      }
    )
  );

  results.push(
    await expectStatus(
      "admin can list bookings",
      () => request<{ bookings?: Array<{ id?: string }> }>("/admin/bookings", { token: admin.accessToken }),
      [200],
      (payload) => {
        const bookings = (payload as { bookings?: Array<{ id?: string }> })?.bookings || [];
        if (bookings.length === 0) throw new Error("Expected admin bookings list to be non-empty");
      }
    )
  );

  results.push(
    await expectStatus(
      "cleanup admin delete schedule",
      () =>
        request(`/admin/schedules/${createdScheduleId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "cleanup admin delete jeepney",
      () =>
        request(`/admin/jeepneys/${createdJeepneyId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  results.push(
    await expectStatus(
      "cleanup admin delete route",
      () =>
        request(`/admin/routes/${createdRouteId}`, {
          method: "DELETE",
          token: admin.accessToken,
        }),
      [200]
    )
  );

  const passed = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);

  // eslint-disable-next-line no-console
  console.table(
    results.map((result) => ({
      check: result.name,
      status: result.ok ? "PASS" : "FAIL",
      details: result.details,
    }))
  );
  // eslint-disable-next-line no-console
  console.log(`Booking smoke complete: ${passed.length} passed, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
};

void run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Booking smoke run failed:", error);
  process.exit(1);
});

export {};
