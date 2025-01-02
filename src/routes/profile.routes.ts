import { Router } from "express";
// import { createOrUpdateProfile, getProfile } from "../controllers/userProfile.controller";
import verifyJWT from "../middlewares/auth.middleware";
import { getUserProfile } from "../controllers/userProfile.controller";

const router = Router();

router.get('/getProfile', verifyJWT,getUserProfile);
// router.post('/updateProfile', verifyJWT, createOrUpdateProfile);


export default router;
