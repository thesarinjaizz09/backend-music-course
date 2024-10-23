import { z } from 'zod';

export const signUpSchema = z.object({
  username: z.string().min(3, 'Username is required').max(25, 'Username must be at most 25 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

// Type inference for User signup data validation
export type SignupInput = z.infer<typeof signUpSchema>;
