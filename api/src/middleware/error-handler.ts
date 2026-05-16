import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  // eslint-disable-next-line no-console
  console.error(error);
  return res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error",
  });
};
