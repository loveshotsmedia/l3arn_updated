/**
 * Request body Zod validation middleware.
 *
 * Usage:
 *   router.post("/path", validateBody(MySchema), handler);
 *
 * If validation fails, responds with 400 and a structured error body.
 * If validation passes, attaches the parsed (typed) body to req.body.
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Factory: returns an Express middleware that validates req.body against `schema`.
 * On success: req.body is replaced with the parsed (Zod-coerced) value.
 * On failure: responds 400 with structured error details.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = (result.error as ZodError).issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      res.status(400).json({
        error: "INVALID_REQUEST_BODY",
        message: "Request body failed validation.",
        issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
