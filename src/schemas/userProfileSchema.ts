import { z } from "zod";

export const userProfileSchema = z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    dateOfBirth: z.string(),
    gender: z.string().min(4).max(15),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
