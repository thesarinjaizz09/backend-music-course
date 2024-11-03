import { Router } from "express";
import { fetchAndStoreModule } from "../controllers/module.controller";

const router = Router();

router.get('/:moduleId', fetchAndStoreModule);

export default router;