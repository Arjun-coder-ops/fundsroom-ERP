import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

// Verifies the Authorization: Bearer <token> header and attaches the
// decoded user identity to req.user. Every protected route depends on this
// running first - authorization checks never trust the frontend alone.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or invalid Authorization header'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

// Restricts a route to a specific set of roles. Must run after authenticate().
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden(`Role '${req.user.role}' is not permitted to perform this action`));
    }
    return next();
  };
}
