// controllers/admin.controller.ts
import { Request, Response } from "express";
import { updateAdminRoleSchema,
    adminUserFilterSchema, 
    adminSignUpSchema, 
    adminLoginSchema, 
    adminChangePasswordSchema 
} from "../schemas/adminSchema";
import db from "../db/db_connect";
import { admins, adminRefreshTokens, Admin, NewAdmin } from "../models";
import { eq, sql, ilike, and } from "drizzle-orm";
import ApiError from "../utils/ApiError";
import { comparePassword, hashPassword } from "../utils/passwordUtils";
import ApiResponse from "../utils/ApiResponse";
import {
  generateAdminAccessToken,
  generateAdminRefreshToken,
  verifyAdminRefreshToken,
} from "../utils/adminTokenUtils";
import asyncHandler from "../utils/asyncHandler";
import z from "zod";
import { AdminWithoutPassword } from "../@types/admin.types";

interface AdminRequest extends Request {
  admin?: AdminWithoutPassword;
}

// Cookie options for secure storage
const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const registerAdmin = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Validate admin input
    const validatedData = adminSignUpSchema.parse(req.body);

    const existingAdmin: Admin[] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, validatedData.email))
      .limit(1);
  
    if (existingAdmin.length > 0) {
      throw new ApiError(409, "Admin user already exists");
    }
   
    const hashedPassword = await hashPassword(validatedData.password);
  
    const [newAdmin]: NewAdmin[] = await db
      .insert(admins)
      .values({
        email: validatedData.email,
        password: hashedPassword,
        role: 'user', // Default role for new admin signups
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
  
    if (!newAdmin || !newAdmin.adminId) {
      throw new ApiError(500, "Admin user creation failed");
    }
      
    const [savedAdmin]: Admin[] = await db
      .select()
      .from(admins)
      .where(eq(admins.adminId, newAdmin.adminId))
      .limit(1);
      
    if (!savedAdmin) {
      throw new ApiError(500, "An error occurred while registering the admin user");
    }
    
    // Exclude sensitive fields from the response
    const { password: _, ...adminWithoutPassword } = savedAdmin;
    
    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { admin: adminWithoutPassword },
          "Admin user created successfully. Contact an administrator to upgrade your permissions."
        )
      );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
      return;
    }

    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "An error occurred while registering the admin user",
    });
  }
});

const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);
    
    // Find the admin
    const admin: Admin[] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email))
      .limit(1);

    if (admin.length === 0) {
      throw new ApiError(404, "Admin not found");
    }

    // Check if admin is active
    if (!admin[0].isActive) {
      throw new ApiError(403, "Account is deactivated. Contact an administrator.");
    }
    
    // Password check
    const isPasswordValid = await comparePassword(password, admin[0].password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }
 
    const { password: _, ...adminWithoutPassword } = admin[0];

    const accessToken = generateAdminAccessToken(adminWithoutPassword);
    const refreshToken = generateAdminRefreshToken(adminWithoutPassword);
    
    // Store refresh token in the database with expiration time
    await db.insert(adminRefreshTokens).values({
      token: refreshToken,
      adminId: admin[0].adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
  
    res.cookie("adminAccessToken", accessToken, {
      ...adminCookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.cookie("adminRefreshToken", refreshToken, {
      ...adminCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
   
    res.status(200).json(
      new ApiResponse(
        200,
        {
          admin: adminWithoutPassword,
          adminAccessToken: accessToken,      
          adminRefreshToken: refreshToken,
        },
        "Admin logged in successfully"
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
      return;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while logging in the admin");
  }
});

const logoutAdmin = asyncHandler(async (req: Request, res: Response) => {
   const refreshToken = req.cookies?.adminRefreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    res.clearCookie("adminAccessToken", adminCookieOptions);
    res.clearCookie("adminRefreshToken", adminCookieOptions);
    
    res.status(200).json(
      new ApiResponse(200, null, "Admin logged out successfully")
    );
  }

  try {
    await db.delete(adminRefreshTokens).where(eq(adminRefreshTokens.token, refreshToken));
  } catch (error) {
    console.error("Failed to delete refresh token:", error);
  }

  res.clearCookie("adminAccessToken", adminCookieOptions);
  res.clearCookie("adminRefreshToken", adminCookieOptions);


  res.status(200).json(new ApiResponse(200, null, "Admin logged out successfully"));
});

const refreshAdminAccessToken = asyncHandler(async (req: Request, res: Response) => {
   console.log("All cookies received:", req.cookies);
  console.log("Cookie header:", req.headers.cookie);

  const adminRefreshToken = req.cookies?.adminRefreshToken || req.body?.adminRefreshToken;

  if (!adminRefreshToken) {
    throw new ApiError(401, "Admin refresh token is missing from cookies and request body");
  }

  try {
    // Verify refresh token validity
    const { valid, decoded } = verifyAdminRefreshToken(adminRefreshToken);
    if (
      !valid ||
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.admin?.adminId
    ) {
      throw new ApiError(403, "Invalid refresh token");
    }

    // Check if refresh token exists in the database and is not expired
    const storedToken = await db
      .select()
      .from(adminRefreshTokens)
      .where(
        and(
          eq(adminRefreshTokens.token, adminRefreshToken),
          sql`${adminRefreshTokens.expiresAt} > ${new Date()}`
        )
      )
      .limit(1);

    if (storedToken.length === 0) {
      throw new ApiError(403, "Refresh token not found or expired");
    }

    // Check if admin is still active
    const currentAdmin = await db
      .select()
      .from(admins)
      .where(eq(admins.adminId, decoded.admin.adminId))
      .limit(1);

    if (currentAdmin.length === 0 || !currentAdmin[0].isActive) {
      throw new ApiError(403, "Admin account is deactivated");
    }

    const { password: _, ...adminWithoutPassword } = currentAdmin[0];

    // Generate a new access token and refresh token
    const newAccessToken = generateAdminAccessToken(adminWithoutPassword);
    const newRefreshToken = generateAdminRefreshToken(adminWithoutPassword);

    // Store new refresh token in the database
    await db.insert(adminRefreshTokens).values({
      token: newRefreshToken,
      adminId: decoded.admin.adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    });

    // Delete the old refresh token from the database
    await db.delete(adminRefreshTokens).where(eq(adminRefreshTokens.token, adminRefreshToken));

    // Set cookies with the new tokens
    res.cookie("adminAccessToken", newAccessToken, {
      ...adminCookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.cookie("adminRefreshToken", newRefreshToken, {
      ...adminCookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Admin access token refreshed successfully"
        )
      );
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        statusCode: error.statusCode,
        message: error.message,
        success: false,
      });
    } else {
      res
        .status(500)
        .json({
          statusCode: 500,
          message: "An error occurred while refreshing the admin access token",
          success: false,
        });
    }
  }
});

const changeAdminPassword = asyncHandler(async (req: AdminRequest, res: Response) => {
  const adminId = req.admin?.adminId;
  if (!adminId) {
    throw new ApiError(401, "Admin not authenticated");
  }
  
  try {
    const { oldPassword, newPassword } = adminChangePasswordSchema.parse(req.body);

    const admin = await db
      .select()
      .from(admins)
      .where(eq(admins.adminId, adminId))
      .limit(1);

    if (admin.length === 0) {
      throw new ApiError(404, "Admin not found");
    }

    const isPasswordValid = await comparePassword(oldPassword, admin[0].password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid current password");
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.update(admins)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(admins.adminId, adminId));

    res.status(200).json(new ApiResponse(200, null, "Admin password changed successfully"));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
      return;
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "An error occurred while changing the admin password");
  }
});


const getAllAdmins = asyncHandler(async (req: AdminRequest, res: Response) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = adminUserFilterSchema.parse(req.query);
    
    const whereConditions = [];
    
    if (role) {
      whereConditions.push(eq(admins.role, role));
    }
    
    if (typeof isActive === 'boolean') { // Better check for boolean
      whereConditions.push(eq(admins.isActive, isActive));
    }

    if (search) {
      whereConditions.push(ilike(admins.email, `%${search}%`));
    }

    // Build query in one go without reassignment
    const adminsList = await db.select({
      adminId: admins.adminId,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      createdAt: admins.createdAt,
      updatedAt: admins.updatedAt
    }).from(admins)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined) // Conditional where
      .limit(limit || 10)
      .offset(((page || 1) - 1) * (limit || 10))
      .orderBy(admins.createdAt);

    // Get total count with same conditions
    const totalAdmins = await db.select({ count: sql`count(*)` }).from(admins)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.status(200).json(
      new ApiResponse(200, {
        admins: adminsList,
        pagination: {
          page: page || 1,
          limit: limit || 10,
          total: Number(totalAdmins[0].count)
        }
      }, 'Admin users retrieved successfully')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
      return;
    }
    throw new ApiError(500, "An error occurred while fetching admin users");
  }
});


// const updateAdminRole = asyncHandler(async (req: AdminRequest, res: Response) => {
//   const currentAdmin = req.admin;
  
//   // Only admins can change roles
//   if (currentAdmin?.role !== 'admin') {
//     throw new ApiError(403, 'Only admins can change user roles');
//   }

//   try {
//     const { adminId, role, isActive } = updateAdminRoleSchema.parse(req.body);

//     if (!adminId) {
//       throw new ApiError(400, 'Admin ID is required');
//     }

//     // Prevent admin from demoting themselves
//     if (adminId === currentAdmin.adminId && role === 'user') {
//       throw new ApiError(400, 'You cannot demote yourself');
//     }

//     const updateData: any = { updatedAt: new Date() };
    
//     if (role !== undefined) {
//       updateData.role = role;
//     }
    
//     if (isActive !== undefined) {
//       updateData.isActive = isActive;
//     }

//     const [updatedAdmin] = await db
//       .update(admins)
//       .set(updateData)
//       .where(eq(admins.adminId, adminId))
//       .returning();

//     if (!updatedAdmin) {
//       throw new ApiError(404, 'Admin user not found');
//     }

//     const { password: _, ...adminWithoutPassword } = updatedAdmin;

//     res.status(200).json(
//       new ApiResponse(200, { admin: adminWithoutPassword }, 'Admin user updated successfully')
//     );
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       res.status(400).json({
//         success: false,
//         message: error.errors[0].message,
//       });
//       return;
//     }
//     if (error instanceof ApiError) {
//       throw error;
//     }
//     throw new ApiError(500, "An error occurred while updating admin user");
//   }
// });

// const getAdminProfile = asyncHandler(async (req: AdminRequest, res: Response) => {
//   const admin = req.admin;
  
//   if (!admin) {
//     throw new ApiError(401, "Admin not authenticated");
//   }

//   res.status(200).json(
//     new ApiResponse(200, { admin }, "Admin profile retrieved successfully")
//   );
// });

export { 
  registerAdmin, 
  loginAdmin, 
  refreshAdminAccessToken, 
  logoutAdmin, 
  changeAdminPassword,
  getAllAdmins,
//   updateAdminRole,
//   getAdminProfile
};
