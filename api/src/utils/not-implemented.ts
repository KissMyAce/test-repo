import { Response } from "express";

export const notImplemented = (res: Response, endpoint: string) => {
  return res.status(501).json({
    error: "NOT_IMPLEMENTED",
    message: "Endpoint scaffolded from API contract; implementation pending.",
    endpoint,
  });
};
