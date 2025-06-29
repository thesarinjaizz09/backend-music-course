// controllers/exam.controller.ts
import { Request, Response, NextFunction } from "express";
import db from "../db/db_connect";
import { 
  exams as examsTable, 
  mcqQuestions, 
  mcqOptions, 
  examAttempts,
  courses,
  years, 
  orders
} from "../models";
import { eq, and } from "drizzle-orm";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";
import { UserWithoutPassword } from "../@types/types";
import z from "zod";
import { resolveMultipleOrderItems } from '../utils/orderHelpers';

const getExamSchema = z.object({
  courseId: z.string().transform(Number),
  yearId: z.string().transform(Number),
  weekNumber: z.string().transform(Number),
  type: z.enum(['mcq', 'assignment'])
});

const submitMcqSchema = z.object({
  examId: z.number(),
  responses: z.array(z.object({
    questionId: z.number(),
    selectedOptionId: z.number()
  }))
});


const getExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  const userId = user?.userId;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }
console.log('Fetching exam with userId:', userId);
  try {
    const { courseId, yearId, weekNumber, type } = getExamSchema.parse(req.query);

    const hasAccess = await checkUserAccess(userId, courseId, yearId);
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have access to this exam');
    }

    const examResults = await db.select()
      .from(examsTable)
      .where(and(
        eq(examsTable.courseId, courseId),
        eq(examsTable.yearId, yearId),
        eq(examsTable.weekNumber, weekNumber),
        eq(examsTable.type, type as any)
      ))
      .limit(1);

    if (examResults.length === 0) {
      throw new ApiError(404, 'Exam not found');
    }

    const exam = examResults[0];

    const courseResults = await db.select({ 
      courseId: courses.courseId,
      courseName: courses.courseName 
    })
    .from(courses)
    .where(eq(courses.courseId, courseId))
    .limit(1);

    const yearResults = await db.select({ 
      yearId: years.yearId,
      yearName: years.yearName 
    })
    .from(years)
    .where(eq(years.yearId, yearId))
    .limit(1);

    const attemptsResults = await db.select()
      .from(examAttempts)
      .where(and(
        eq(examAttempts.examId, exam.examId),
        eq(examAttempts.userId, userId)
      ))
      .orderBy(examAttempts.submittedAt);

    let questions: Array<{
      questionId: number;
      question: string;
      questionOrder: number;
      options: Array<{
        optionId: number;
        optionText: string;
        optionOrder: number;
      }>;
    }> = [];

    if (type === 'mcq') {
      const questionsResults = await db.select()
        .from(mcqQuestions)
        .where(eq(mcqQuestions.examId, exam.examId))
        .orderBy(mcqQuestions.questionOrder);

      for (const question of questionsResults) {
        const optionsResults = await db.select({
          optionId: mcqOptions.optionId,
          optionText: mcqOptions.optionText,
          optionOrder: mcqOptions.optionOrder
        })
        .from(mcqOptions)
        .where(eq(mcqOptions.questionId, question.questionId))
        .orderBy(mcqOptions.optionOrder);

        questions.push({
          questionId: question.questionId,
          question: question.question,
          questionOrder: question.questionOrder,
          options: optionsResults
        });
      }
    }

    const isUnlocked = await checkExamUnlocked(userId, exam.examId);
    if (!isUnlocked) {
      throw new ApiError(423, 'This exam is locked. Complete previous requirements first.');
    }

    const courseName = courseResults.length > 0 ? courseResults[0].courseName : '';
    const yearName = yearResults.length > 0 ? yearResults[0].yearName : '';

    const baseResponse = {
      examId: exam.examId,
      courseId: exam.courseId,
      courseName,
      yearName,
      weekNumber: exam.weekNumber,
      type: exam.type,
      title: exam.title,
      description: exam.description,
      isActive: exam.isActive,
      attempts: attemptsResults.map(attempt => ({
        attemptId: attempt.attemptId,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        gradedAt: attempt.gradedAt
      }))
    };

    let response: any;
    if (type === 'mcq') {
      response = {
        ...baseResponse,
        questions
      };
    } else {
      response = {
        ...baseResponse,
        assignmentPrompt: exam.description,
        canResubmit: attemptsResults.length === 0 || 
                    (attemptsResults.length > 0 && 
                     attemptsResults[attemptsResults.length - 1].gradedAt && 
                     !attemptsResults[attemptsResults.length - 1].passed)
      };
    }

    res.status(200).json(
      new ApiResponse(200, response, 'Exam retrieved successfully')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'An error occurred while fetching exam');
  }
});

const getCourseExams = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserWithoutPassword;
  const userId = user?.userId;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  try {
    const { courseId, yearId } = z.object({
      courseId: z.string().transform(Number),
      yearId: z.string().transform(Number)
    }).parse(req.params);


    const hasAccess = await checkUserAccess(userId, courseId, yearId);
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have access to these exams');
    }

    const courseExamsResults = await db.select()
      .from(examsTable)
      .where(and(
        eq(examsTable.courseId, courseId),
        eq(examsTable.yearId, yearId)
      ))
      .orderBy(examsTable.weekNumber, examsTable.type);

    const examSummary = await Promise.all(courseExamsResults.map(async (exam) => {
      const attemptsResults = await db.select()
        .from(examAttempts)
        .where(and(
          eq(examAttempts.examId, exam.examId),
          eq(examAttempts.userId, userId)
        ))
        .orderBy(examAttempts.submittedAt);

      const isUnlocked = await checkExamUnlocked(userId, exam.examId);
      const latestAttempt = attemptsResults.length > 0 ? attemptsResults[attemptsResults.length - 1] : null;
      
      return {
        examId: exam.examId,
        weekNumber: exam.weekNumber,
        type: exam.type,
        title: exam.title,
        description: exam.description,
        isUnlocked,
        attemptCount: attemptsResults.length,
        passed: latestAttempt?.passed || false,
        lastAttemptDate: latestAttempt?.submittedAt || null,
        isGraded: latestAttempt?.gradedAt ? true : false
      };
    }));

    res.status(200).json(
      new ApiResponse(200, { exams: examSummary }, 'Course exams retrieved successfully')
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'An error occurred while fetching course exams');
  }
});


async function checkUserAccess(userId: number, courseId: number, yearId: number): Promise<boolean> {
  try {
    
    const userOrders = await db.select()
      .from(orders)
      .where(eq(orders.userId, userId));


    if (userOrders.length === 0) {
      return false;
    }

    const allOrderItems: any[] = [];
    for (const order of userOrders) {
      const orderItemsResults = await db.query.orderItems.findMany({
        where: (orderItems, { eq }) => eq(orderItems.orderId, order.orderId)
      });

      allOrderItems.push(...orderItemsResults);
    }


    const resolvedItems = await resolveMultipleOrderItems(allOrderItems);

    const hasAccess = resolvedItems.some(item => {
      
      if (item.courseId === courseId) {
        return true;
      }
      
      if (item.yearId === yearId) {
        return true;
      }
      
      return false;
    });

    if (!hasAccess) {
      const yearCourseResult = await db.select({ courseId: years.courseId })
        .from(years)
        .where(eq(years.yearId, yearId))
        .limit(1);
      
      if (yearCourseResult.length > 0) {
        const yearCourseId = yearCourseResult[0].courseId;
        
        const hasCourseAccess = resolvedItems.some(item => {
          if (item.courseId === yearCourseId) {
            return true;
          }
          return false;
        });
        
        if (hasCourseAccess) {
          return true;
        }
      }
    }
    
    return hasAccess;
  } catch (error) {
    return false;
  }
}


async function checkExamUnlocked(userId: number, examId: number): Promise<boolean> {
  try {
    const examResults = await db.select()
      .from(examsTable)
      .where(eq(examsTable.examId, examId))
      .limit(1);

    if (examResults.length === 0) return false;

    const currentExam = examResults[0];

    // For now, return true - implement detailed unlocking logic later
    // This is where you'd check:
    // - Previous MCQ exam completions
    // - Video completion requirements
    // - Assignment submission requirements
    return true;
  } catch (error) {
    console.error('Error checking exam unlock status:', error);
    return false;
  }
}

export {
  getExam,
  getCourseExams
};
