import { Router } from "express";
import { createOrUpdateProfile, getProfile } from "../controllers/userProfile.controller";
import verifyJWT from "../middlewares/auth.middleware";

const router = Router();

router.get('/getProfile', verifyJWT,getProfile);
router.post('/updateProfile', verifyJWT, createOrUpdateProfile);


export default router;
