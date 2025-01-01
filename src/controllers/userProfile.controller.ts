// import { eq } from "drizzle-orm";
// import { UserProfileData } from "../@types/types";
// import db from "../db/db_connect";
// import { users, userProfiles, years, modules } from "../models";
// import asyncHandler from "../utils/asyncHandler";
// import { Request, Response } from "express";
// import ApiError from "../utils/ApiError";
// import { userProfileschema } from "../schemas/userProfileschema";
// import ApiResponse from "../utils/ApiResponse";
// import { v4 as uuidv4 } from "uuid";

// const getUserProfile = async (userId: string) => {
    
//     const user = await db
//     .select({
//         id: users.userId,
//         username: users.username,
//         email: users.email,
//         firstName: userProfiles.firstName,
//         lastName: userProfiles.lastName,
//         dateOfBirth: userProfiles.dateOfBirth,
//         gender: userProfiles.gender,
//         registeredAt: users.createdAt,
//     })
//     .from(users)
//     .leftJoin(userProfiles, eq(users.userId, userProfiles.userId))
//     .where(eq(users.userId, userId))
//     .limit(1);

//     if (user.length === 0) {
//         return null;
//     }

//     const enrolledModules = await db
//     .select({
//         moduleId: Modules.id,
//         title: Modules.title,
//         description: Modules.description,
//         enrollmentDate: UserModules.enrollmentDate,
//         progress: UserModules.progress,
//         completed: UserModules.completed,
//     })
//     .from(UserModules)
//     .innerJoin(Modules, eq(UserModules.moduleId, Modules.id))
//     .where(eq(UserModules.userId, userId));

//     return {
//         id: user[0].id,
//         username: user[0].username,
//         email: user[0].email,
//         firstName: user[0].firstName || '',
//         lastName: user[0].lastName || '',
//         dateOfBirth: user[0].dateOfBirth,
//         gender: user[0].gender || '',
//         registeredAt: user[0].registeredAt,
//         enrolledModules,
//     }
// }

// const getProfile = asyncHandler(async (req: Request, res: Response) => {
//     const userId = req.user?.id;
//     if(!userId){
//         throw new ApiError(401, 'Unauthorized');
//     }

//     const profile = await getUserProfile(userId);
//     if(!profile){
//         throw new ApiError(404, 'User not found');
//     }
//     res.json(profile);
// });

// const createOrUpdateProfile = asyncHandler(async (req: Request, res: Response) => {
//     const userId = req.user?.useImperativeHandle(
//       first,
//       () => {
//         second
//       },
//       [third],
//     );
//     if (!userId) {
//         throw new ApiError(401, 'Unauthorized');
//     }

//     const validatedData = userProfileschema.parse(req.body);

//     const existingProfile = await db
//     .select()
//     .from(userProfiles)
//     .where(eq(userProfiles.userId, userId))
//     .limit(1);

//     await db.transaction(async (tx) => {
//         if (existingProfile.length > 0) {
//             await tx.update(userProfiles)
//             .set(validatedData)
//             .where(eq(userProfiles.userId, userId));
//             res.status(200).json(new ApiResponse(200, null, 'Profile updated successfully'));
//         } else {
//             await tx.insert(userProfiles)
//             .values({ id: uuidv4(), userId, ...validatedData });
//             res.status(201).json(new ApiResponse(201, null, 'Profile created successfully'));
//         }
//     });
// });


// export {getProfile, createOrUpdateProfile};
