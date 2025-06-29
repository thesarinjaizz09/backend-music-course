// routes/exam.routes.ts
import { Router } from 'express';
import { getExam, getCourseExams } from '../controllers/exam.controller';
import  verifyJWT  from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyJWT);

router.get('/exam', getExam);

// Get all exams for a course/year
router.get('/course/:courseId/year/:yearId/exams', getCourseExams);

export default router;
