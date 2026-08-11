import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { signToken } from '../utils/jwt';
import { LoginInput } from '../validation/auth.validation';

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) throw AppError.notFound('User not found');
  return user;
}
