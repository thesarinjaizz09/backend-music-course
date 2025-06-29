// utils/adminTokenUtils.ts
import jwt from 'jsonwebtoken';
import { AdminWithoutPassword, AdminJWTPayload } from '../@types/admin.types';

const ADMIN_ACCESS_TOKEN_SECRET = process.env.ADMIN_ACCESS_TOKEN_SECRET as string;
const ADMIN_REFRESH_TOKEN_SECRET = process.env.ADMIN_REFRESH_TOKEN_SECRET as string;

if (!ADMIN_ACCESS_TOKEN_SECRET || !ADMIN_REFRESH_TOKEN_SECRET) {
  throw new Error('Admin JWT secrets must be defined in environment variables');
}

// Generate Admin Access Token
export const generateAdminAccessToken = (admin: AdminWithoutPassword): string => {
    return jwt.sign(
        { admin }, 
        ADMIN_ACCESS_TOKEN_SECRET, 
        {
            expiresIn: process.env.ADMIN_ACCESS_TOKEN_EXPIRATION || '24h',
        }
    );
};

// Generate Admin Refresh Token
export const generateAdminRefreshToken = (admin: AdminWithoutPassword): string => {
    return jwt.sign(
        { admin }, 
        ADMIN_REFRESH_TOKEN_SECRET, 
        {
            expiresIn: process.env.ADMIN_REFRESH_TOKEN_EXPIRATION || '7d',
        }
    );
};

// Verify Admin Access Token
export const verifyAdminAccessToken = (token: string) => {
    try {
      const decoded = jwt.verify(token, ADMIN_ACCESS_TOKEN_SECRET) as AdminJWTPayload;
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error };
    }
};

// Verify Admin Refresh Token
export const verifyAdminRefreshToken = (token: string) => {
    try {
      const decoded = jwt.verify(token, ADMIN_REFRESH_TOKEN_SECRET) as AdminJWTPayload;
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error };
    }
};
