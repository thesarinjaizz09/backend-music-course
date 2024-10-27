import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import ApiError from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import db from '../db/db_connect';
import { Users, User } from '../models/user.model';
import { eq } from 'drizzle-orm';

const verifyJWT = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Get the token from cookies or headers
    // Check if the token exists
    // Verify the token using promises
    // Fetch the user from the database
    // check if the user exists
    // Attach the user to the request object, excluding sensitive field
    // Call the next middleware
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(401, "Access token is required");
    }

    // Verify the token using promises
    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
        const user = await db
        .select()
        .from(Users)
        .where(eq(Users.id,decodedToken.userId))
        .limit(1)
        .then(rows => rows[0]);

        if (!user) {
            return next(new ApiError(401, "Invalid Access Token"));
        }

       
    // if (user) {
    //     req.user = { id: user.id, username: user.username, email: user.email } as User;
    // }

        next();
    } catch (err) {
        next(new ApiError(403, "Invalid access token"));
    }
});

export default verifyJWT;
