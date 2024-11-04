import { Router } from "express";
import { fetchAndStoreAllModules, fetchAndStoreModule } from "../controllers/module.controller";

const router = Router();

router.get('/fetchAll', fetchAndStoreAllModules);
router.get('/:moduleId', fetchAndStoreModule);

export default router;