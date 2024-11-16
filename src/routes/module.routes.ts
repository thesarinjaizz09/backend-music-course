import { Router } from "express";
import { fetchAndStoreAllModules, fetchAndStoreModule, testfetchAndStoreAllModules } from "../controllers/module.controller";

const router = Router();

router.get('/fetchAll', fetchAndStoreAllModules);
router.get('/test', testfetchAndStoreAllModules)
router.get('/:moduleId', fetchAndStoreModule);

export default router;
