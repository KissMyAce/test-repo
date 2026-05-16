import { NextFunction, Request, Response } from "express";

export const asyncHandler =
  <T extends Request>(
    handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as T, res, next)).catch(next);
  };
