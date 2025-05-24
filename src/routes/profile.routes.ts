import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware";
import { getProfile, getUserProfile, updateUserDetails } from "../controllers/userProfile.controller";

const router = Router();

router.get('/getProfile', verifyJWT,getUserProfile);
router.put('/', verifyJWT, updateUserDetails);
router.get('/', verifyJWT, getProfile );


export default router;
