import { AnyZodObject, ZodError } from "zod";
import { NextFunction, Request, Response } from "express";

export const validate =
  (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          issues: error.flatten(),
        });
      }
      return res.status(400).json({ error: "INVALID_REQUEST" });
    }
  };
