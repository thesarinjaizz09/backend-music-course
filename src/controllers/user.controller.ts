import { Request, Response } from "express"
import { SignupInput, signUpSchema } from "../schemas/signUpSchema"
import db from "../db/db_connect";
import { Users } from "../models/user.model";
import { eq } from 'drizzle-orm';
import ApiError from "../utils/ApiError";
import { hashPassword } from "../utils/passwordUtils";
import { v4 as uuidv4 } from 'uuid';
import ApiResponse from "../utils/ApiResponse";

const registerUser = async (req: Request, res: Response): Promise<void>  => {
    // get user details from frontend
    // validation - not empty
    // check if user exists: email
    // hash password
    // save user to db
    // check for user creation
    // send response
    try {
        const userData: SignupInput = req.body; // user data
        // validation
        const validatedData = signUpSchema.parse(userData);
        //check if user exists
        const existingUser = await db.select().from(Users).where(eq(Users.email, validatedData.email)).limit(1);

        if(existingUser.length > 0) {
            throw new ApiError(409, "User already exists");
        }
        // hash password
        const hashedPassword = await hashPassword(validatedData.password);

        // save user to db
        const newUser = await db.insert(Users).values({
            id: uuidv4(),
            username: validatedData.username,
            email: validatedData.email,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        // Check if the user was successfully saved in the database
        const savedUser = await db.select().from(Users).where(eq(Users.id, newUser[0].id)).limit(1);
        if (savedUser.length === 0) {
            throw new ApiError(500, "An error occurred while registering the user");
        }
        res.status(201).json(
            new ApiResponse(
                200,
                savedUser[0],
                "User created successfully"
            )
        )
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "An error occurred while registering the user";
        res.status(500).json({ success: false, message: errMsg });
    }
}

export default registerUser;