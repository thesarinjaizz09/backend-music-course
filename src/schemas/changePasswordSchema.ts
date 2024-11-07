import { z } from 'zod';

const passwordSchema = z.string().min(8, "Password must be at least 8 characters long");

export const changePasswordSchema = z.object({
  oldPassword: passwordSchema,
  newPassword: passwordSchema
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
