import { Request, Response } from "express";
import { signUpSchema } from "../schemas/signUpSchema";
import db from "../db/db_connect";
import { Users } from "../models/user.model";
import { eq, sql } from "drizzle-orm";
import ApiError from "../utils/ApiError";
import { comparePassword, hashPassword } from "../utils/passwordUtils";
import { v4 as uuidv4 } from "uuid";
import ApiResponse from "../utils/ApiResponse";
import { loginSchema } from "../schemas/loginSchema";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/tokenUtils";
import { RefreshTokens } from "../models/refreshTokens.model";
import asyncHandler from "../utils/asyncHandler";
import z from "zod";
import { changePasswordSchema } from "../schemas/changePasswordSchema";

// Cookie options for secure storage
const cookieOptions = {
  httpOnly: true,
  secure: true, // Always set to true
  sameSite: 'strict' as const, // Corrected to lowercase
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // get user details from frontend
  // validation - not empty
  // check if user exists: email
  // hash password
  // save user to db
  // check for user creation
  // send response
  try {
   
    // Validate user input
    const validatedData = signUpSchema.parse(req.body);

    const existingUser = await db
      .select()
      .from(Users)
      .where(eq(Users.email, validatedData.email))
      .limit(1);
  
    if (existingUser.length > 0) {
      throw new ApiError(409, "User already exists");
    }
   
    const hashedPassword = await hashPassword(validatedData.password);
  
    const newUser = await db
      .insert(Users)
      .values({
        id: uuidv4(),
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  
    const savedUser = await db
      .select()
      .from(Users)
      .where(eq(Users.id, newUser[0].id))
      .limit(1);
    if (savedUser.length === 0) {
      throw new ApiError(500, "An error occurred while registering the user");
    }
    // Exclude sensitive fields from the response user object
    const { password: _, ...userWithoutPassword } = savedUser[0];
    res
      .status(201)
      .json(
        new ApiResponse(
          200,
          { user: userWithoutPassword },
          "User created successfully"
        )
      );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }

    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while registering the user",
    });
  }
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  // get user details from frontend
  // validation - not empty
  // find the user
  // password check
  // access and refresh token generation
  // send cookies
  // send response
 try {
   const { email, password } = loginSchema.parse(req.body);
   // find the user
   const user = await db
     .select()
     .from(Users)
     .where(eq(Users.email, email))
     .limit(1);

   if (user.length === 0) {
     throw new ApiError(404, "User not found");
   }
   // password check
   const isPasswordValid = await comparePassword(password, user[0].password);
   if (!isPasswordValid) {
     throw new ApiError(401, "Invalid credentials");
   }
 
  
   const { password: _,createdAt, updatedAt, ...userWithoutPassword } = user[0];

   
   const accessToken = generateAccessToken(userWithoutPassword);
   const refreshToken = generateRefreshToken(userWithoutPassword);
   
   // store refresh token in the database with expiration time
   await db.insert(RefreshTokens).values({
     token: refreshToken,
     userId: user[0].id,
     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
   });
  
   res.cookie("accessToken", accessToken, {
     ...cookieOptions,
     maxAge: 24 * 60 * 60 * 1000, // 24 hours
   });
   res.cookie("refreshToken", refreshToken, {
     ...cookieOptions,
     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
   });
   
   res.status(200).json(
     new ApiResponse(
       200,
       {
         user: userWithoutPassword,
         accessToken,
         refreshToken,
       },
       "User logged in successfully"
     )
   );
 } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while logging in the user");
  }
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // get refresh token from cookies
  // check if the refresh token exists
  // delete the refresh token from the database
  // clear access and refresh token cookies
  // send response
  const refreshToken = req.cookies?.refreshToken;
  if(!refreshToken){
    throw new ApiError(400, "Refresh token is missing");
  }

  await db.delete(RefreshTokens).where(eq(RefreshTokens.token, refreshToken));

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  res.status(200).json(new ApiResponse(200, null, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // Verify refresh token validity
    const { valid, decoded } = verifyRefreshToken(refreshToken);
    if (
      !valid ||
      !decoded ||
      typeof decoded !== "object" ||
      !(decoded.user.id)
    ) {
      throw new ApiError(403, "Invalid refresh token");
    }

    // Check if refresh token exists in the database and is not expired
    const storedToken = await db
      .select()
      .from(RefreshTokens)
      .where(
        sql`${RefreshTokens.token} = ${refreshToken} AND ${
          RefreshTokens.expiresAt
        } > ${new Date()}`
      )
      .limit(1);

    if (storedToken.length === 0) {
      throw new ApiError(403, "Refresh token not found or expired");
    }

    // Generate a new access token and refresh token
    const newAccessToken = generateAccessToken(decoded.user.id);
    const newRefreshToken = generateRefreshToken(decoded.user.id);

    // Store new refresh token in the database
    await db.insert(RefreshTokens).values({
      token: newRefreshToken,
      userId: decoded.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    });

    // Delete the old refresh token from the database
    await db.delete(RefreshTokens).where(eq(RefreshTokens.token, refreshToken));

    // Set cookies with the new tokens
    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    }); // 15 min
    res.cookie("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    }); // 7 days

    res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
        "Access token refreshed successfully"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        statusCode: error.statusCode,
        message: error.message, // Explicitly include error message here
        success: false,
      });
    } else {
      res
        .status(500)
        .json({
          statusCode: 500,
          message: "An error occurred while refreshing the access token",
          success: false,
        });
    }
  }
});

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "User not authenticated");
  }
  try {
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1);

    if(user.length === 0) {
      throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await comparePassword(oldPassword, user[0].password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.update(Users).set({ password: hashedPassword }).where(eq(Users.id, userId));

    res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while changing the password");
    
  }
});

export { registerUser, loginUser, refreshAccessToken, logoutUser,changePassword};
