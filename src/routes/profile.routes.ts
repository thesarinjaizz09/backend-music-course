import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware";
import { getUserProfile, updateUserDetails } from "../controllers/userProfile.controller";

const router = Router();

router.get('/getProfile', verifyJWT,getUserProfile);
router.put('/', verifyJWT, updateUserDetails);


export default router;
