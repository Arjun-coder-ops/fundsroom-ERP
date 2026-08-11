import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

type Target = 'body' | 'query' | 'params';

// Validates and replaces req[target] with the parsed (and coerced) data.
// Thrown ZodErrors are caught by asyncHandler/express and normalized by
// the centralized error handler.
export function validate(schema: AnyZodObject, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[target]);
    (req as any)[target] = parsed;
    next();
  };
}
