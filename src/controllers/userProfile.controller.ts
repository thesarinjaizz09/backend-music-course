import { eq } from "drizzle-orm";
import { UserProfileData } from "../@types/types";
import db from "../db/db_connect";
import { UserProfiles } from "../models/profile.model";
import { Users } from "../models/user.model";
import { Modules } from "../models/module.model";
import { UserModules } from "../models/userModule.model";
import asyncHandler from "../utils/asyncHandler";
import { Request, Response } from "express";
import ApiError from "../utils/ApiError";
import { userProfileSchema } from "../schemas/userProfileSchema";
import ApiResponse from "../utils/ApiResponse";
import { v4 as uuidv4 } from "uuid";

const getUserProfile = async (userId: string) => {
    
    const user = await db
    .select({
        id: Users.id,
        username: Users.username,
        email: Users.email,
        firstName: UserProfiles.firstName,
        lastName: UserProfiles.lastName,
        dateOfBirth: UserProfiles.dateOfBirth,
        gender: UserProfiles.gender,
        registeredAt: Users.createdAt,
    })
    .from(Users)
    .leftJoin(UserProfiles, eq(Users.id, UserProfiles.userId))
    .where(eq(Users.id, userId))
    .limit(1);

    if (user.length === 0) {
        return null;
    }

    const enrolledModules = await db
    .select({
        moduleId: Modules.id,
        title: Modules.title,
        description: Modules.description,
        enrollmentDate: UserModules.enrollmentDate,
        progress: UserModules.progress,
        completed: UserModules.completed,
    })
    .from(UserModules)
    .innerJoin(Modules, eq(UserModules.moduleId, Modules.id))
    .where(eq(UserModules.userId, userId));

    return {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        firstName: user[0].firstName || '',
        lastName: user[0].lastName || '',
        dateOfBirth: user[0].dateOfBirth,
        gender: user[0].gender || '',
        registeredAt: user[0].registeredAt,
        enrolledModules,
    }
}

const getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if(!userId){
        throw new ApiError(401, 'Unauthorized');
    }

    const profile = await getUserProfile(userId);
    if(!profile){
        throw new ApiError(404, 'User not found');
    }
    res.json(profile);
});

const createOrUpdateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
        throw new ApiError(401, 'Unauthorized');
    }

    const validatedData = userProfileSchema.parse(req.body);

    const existingProfile = await db
    .select()
    .from(UserProfiles)
    .where(eq(UserProfiles.userId, userId))
    .limit(1);

    await db.transaction(async (tx) => {
        if (existingProfile.length > 0) {
            await tx.update(UserProfiles)
            .set(validatedData)
            .where(eq(UserProfiles.userId, userId));
            res.status(200).json(new ApiResponse(200, null, 'Profile updated successfully'));
        } else {
            await tx.insert(UserProfiles)
            .values({ id: uuidv4(), userId, ...validatedData });
            res.status(201).json(new ApiResponse(201, null, 'Profile created successfully'));
        }
    });
});


export {getProfile, createOrUpdateProfile};
