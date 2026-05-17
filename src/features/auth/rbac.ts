import { UserRole } from "./types";

export const RBAC_MATRIX: Record<UserRole, string[]> = {
  passenger: [
    "/dashboard",
    "/schedules",
    "/jeepneys",
    "/my-bookings",
    "/booking",
    "/payment",
    "/notifications",
    "/profile",
  ],
  driver: ["/driver"],
  admin: ["/admin"],
};
