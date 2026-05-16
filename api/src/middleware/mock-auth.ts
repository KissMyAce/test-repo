import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/auth";

const VALID_ROLES: UserRole[] = ["passenger", "driver", "admin"];

// Temporary helper so contract routes can be tested before JWT integration.
// Use request header `x-mock-role` and `x-mock-user-id` during local testing.
export const mockAuthContext = (req: Request, _res: Response, next: NextFunction) => {
  const role = req.header("x-mock-role");
  const userId = req.header("x-mock-user-id") || "mock-user-id";

  if (role && VALID_ROLES.includes(role as UserRole)) {
    req.authUser = {
      id: userId,
      role: role as UserRole,
      status: "active",
      email: "mock@example.com",
      name: "Mock User",
    };
  }

  next();
};
