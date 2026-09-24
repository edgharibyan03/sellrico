import { User } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: Date;
}

export function toAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    createdAt: user.createdAt,
  };
}
