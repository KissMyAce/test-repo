import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/auth";
import { verifyAccessToken } from "../utils/token";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing access token" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.authUser = {
      id: decoded.sub,
      role: decoded.role,
      status: decoded.status,
      email: decoded.email,
      name: decoded.name,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid or expired access token" });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    if (!roles.includes(req.authUser.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    return next();
  };
};
