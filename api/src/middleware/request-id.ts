import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header("x-request-id");
  const id = incoming || crypto.randomUUID();
  res.setHeader("x-request-id", id);
  (req as Request & { requestId?: string }).requestId = id;
  next();
};
