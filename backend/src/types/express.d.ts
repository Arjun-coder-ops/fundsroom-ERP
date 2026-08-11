import { Role } from '@prisma/client';

// Augments Express's Request type with the authenticated user attached by
// the auth middleware, so controllers get proper typing for req.user.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        name: string;
      };
    }
  }
}

export {};
