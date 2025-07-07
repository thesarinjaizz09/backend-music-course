// controllers/exam.controller.ts
import { Request, Response, NextFunction } from "express";
import z from "zod";
import db from "../db/db_connect";
import { eq, and, gte, lt } from "drizzle-orm";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import asyncHandler from "../utils/asyncHandler";
import { UserWithoutPassword } from "../@types/types";
import { resolveMultipleOrderItems } from '../utils/orderHelpers';

import { 
  exams as examsTable, 
  mcqQuestions,
  mcqOptions, 
  examAttempts,
  assignmentSubmissions,
  courses,
  years, 
  orders
} from "../models";

import { 
  getExamSchema, 
  submitMcqSchema, 
  submitAssignmentSchema, 
  submitFinalExamSchema   
} from "../schemas/examSchema";

import {
  checkAssignmentReAttemptEligibility,
  getAssignmentQuestions,
  getFinalExamSections
} from './exam.helper.controller';

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
      totalMarks: exam.totalMarks,
      attempts: attemptsResults.map(attempt => ({
        attemptId: attempt.attemptId,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt,
        gradedAt: attempt.gradedAt
      }))
    };

    let response: any = { ...baseResponse };
    switch (type) {
      case 'mcq':
        const mcqQuestions = await getMcqQuestions(exam.examId);
        response.questions = mcqQuestions;
        break;

      case 'assignment':
        const assignmentQuestions = await getAssignmentQuestions(exam.examId);
        response.assignmentPrompt = exam.description;
        response.questions = assignmentQuestions;
        response.canResubmit = attemptsResults.length === 0 || 
                              (attemptsResults.length > 0 && 
                               attemptsResults[attemptsResults.length - 1].gradedAt && 
                               !attemptsResults[attemptsResults.length - 1].passed);
        break;

      case 'final':
        const finalExamSections = await getFinalExamSections(exam.examId);
        response.sections = finalExamSections;
        response.submissionType = 'link'; 
        response.canResubmit = attemptsResults.length === 0 || 
                              (attemptsResults.length > 0 && 
                               attemptsResults[attemptsResults.length - 1].gradedAt && 
                               !attemptsResults[attemptsResults.length - 1].passed);
        break;
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

async function getMcqQuestions(examId: number) {
  const questionsResults = await db.select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId))
    .orderBy(mcqQuestions.questionOrder);

  const questions = [];
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
  return questions;
}


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
    return true;
  } catch (error) {
    console.error('Error checking exam unlock status:', error);
    return false;
  }
}



//submit MCQ exam
//check if exam exists and is MCQ type
//get total questions from database
//validate response and calculate unanswered questions
//get existing attempt
//check if user has already passed this mcq
//check daily limit using attemptNumber and date
//increase attemptNumber and reset it on new day
//update attempt or create new attempt if it is first time
//calculate score and assign pass or fail and store in database
const submitMcqExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserWithoutPassword;
  const userId = user?.userId;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  try {
    const { examId, responses } = submitMcqSchema.parse(req.body);

    const examResults = await db.select()
      .from(examsTable)
      .where(eq(examsTable.examId, examId))
      .limit(1);

    if (!examResults.length || examResults[0].type !== 'mcq') {
      throw new ApiError(404, 'MCQ exam not found');
    }

    const examQuestions = await db.select()
      .from(mcqQuestions)
      .where(eq(mcqQuestions.examId, examId));

    if (examQuestions.length === 0) {
      throw new ApiError(404, 'No MCQ questions found for this exam. Please contact admin.');
    }

    const totalQuestionsInDB = examQuestions.length;

    if (!responses || responses.length === 0) {
      throw new ApiError(400, 'No responses provided');
    }

    const unansweredQuestions = totalQuestionsInDB - responses.length;

    const existingAttempt = await db.select()
      .from(examAttempts)
      .where(and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.examId, examId)
      ))
      .limit(1);

    let attempt;
    let currentAttemptNumber;

    if (existingAttempt.length > 0) {
      if (existingAttempt[0].passed) {
        throw new ApiError(400, 'You have already passed this MCQ exam');
      }

      const today = new Date();
      const lastAttemptDate = new Date(existingAttempt[0].submittedAt!);
      const isToday = today.toDateString() === lastAttemptDate.toDateString();

      if (isToday && existingAttempt[0].attemptNumber >= 3) {
        throw new ApiError(429, `You have reached the daily limit of 3 attempts for this MCQ exam. You can try again tomorrow.`);
      }

      currentAttemptNumber = isToday ? existingAttempt[0].attemptNumber + 1 : 1;

      const [updatedAttempt] = await db.update(examAttempts)
        .set({
          attemptNumber: currentAttemptNumber, 
          submittedAt: new Date(),
          passed: false, 
          gradedAt: null,
          gradedBy: null
        })
        .where(eq(examAttempts.attemptId, existingAttempt[0].attemptId))
        .returning();
      
      attempt = updatedAttempt;
    } else {
      currentAttemptNumber = 1;
      
      const [newAttempt] = await db.insert(examAttempts)
        .values({
          examId,
          userId,
          attemptNumber: currentAttemptNumber,
          submittedAt: new Date()
        })
        .returning();
      
      attempt = newAttempt;
    }


    const questionIds = examQuestions.map(q => q.questionId);
    const submittedQuestionIds = responses.map(r => r.questionId);
    
    for (const submittedId of submittedQuestionIds) {
      if (!questionIds.includes(submittedId)) {
        throw new ApiError(400, `Question ID ${submittedId} does not exist for this exam`);
      }
    }

    let correctAnswers = 0;

    for (const response of responses) {
      const optionResults = await db.select()
        .from(mcqOptions)
        .where(eq(mcqOptions.optionId, response.selectedOptionId))
        .limit(1);

      if (optionResults.length === 0) {
        throw new ApiError(400, `Option ID ${response.selectedOptionId} does not exist for question ${response.questionId}`);
      }

      if (optionResults[0].isCorrect) {
        correctAnswers++;
      }
    }

    const percentage = Math.round((correctAnswers / totalQuestionsInDB) * 100);
    const passed = percentage >= 50;

    await db.update(examAttempts)
      .set({
        passed,
        gradedAt: new Date()
      })
      .where(eq(examAttempts.attemptId, attempt.attemptId));

    const remainingAttempts = passed ? 0 : Math.max(0, 3 - currentAttemptNumber);
    
    let message = '';
    if (passed) {
      message = `Congratulations! You passed with ${percentage}% (${correctAnswers}/${totalQuestionsInDB} correct)`;
    } else {
      if (remainingAttempts > 0) {
        message = `You scored ${percentage}% (${correctAnswers}/${totalQuestionsInDB} correct). You need at least 50% to pass. You have ${remainingAttempts} attempts remaining today.`;
      } else {
        message = `You scored ${percentage}% (${correctAnswers}/${totalQuestionsInDB} correct). You need at least 50% to pass. You have reached the daily limit. You can try again tomorrow.`;
      }
    }

    res.status(200).json(
      new ApiResponse(200, {
        attemptId: attempt.attemptId,
        examId,
        attemptNumber: currentAttemptNumber, 
        totalQuestionsInExam: totalQuestionsInDB,
        questionsAnswered: responses.length,
        correctAnswers,
        incorrectAnswers: totalQuestionsInDB - correctAnswers,
        unansweredQuestions,
        percentage,
        passed,
        passThreshold: 50,
        remainingAttemptsToday: remainingAttempts,
        canRetakeToday: remainingAttempts > 0 && !passed,
        gradedAt: new Date(),
        message
      }, 'MCQ exam submitted and graded successfully')
    );

  } catch (error) {
    console.error('MCQ submission error:', error);
    
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'An error occurred while submitting MCQ exam');
  }
});

//submit assignment exam
//Check if exam exists and is assignment type
//re-attempt logic
//Validate submissions and each submission has either text or link
//Get attempt number for response
//Create exam attempt and Save assignment submissions
const submitAssignmentExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserWithoutPassword;
  const userId = user?.userId;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  try {
    const { examId, submissions } = submitAssignmentSchema.parse(req.body);

    const examResults = await db.select()
      .from(examsTable)
      .where(eq(examsTable.examId, examId))
      .limit(1);

    if (!examResults.length || examResults[0].type !== 'assignment') {
      throw new ApiError(404, 'Assignment exam not found');
    }

    const { canAttempt, reason } = await checkAssignmentReAttemptEligibility(userId, examId);
    if (!canAttempt) {
      throw new ApiError(400, reason || 'Cannot re-attempt this assignment');
    }

    if (!submissions || submissions.length === 0) {
      throw new ApiError(400, 'No submissions provided');
    }

    for (const submission of submissions) {
      if (submission.submissionType === 'text' && !submission.textAnswer) {
        throw new ApiError(400, 'Text answer is required for text submissions');
      }
      if (submission.submissionType === 'link' && !submission.linkUrl) {
        throw new ApiError(400, 'Link URL is required for link submissions');
      }
    }

    const existingAttempts = await db.select()
      .from(examAttempts)
      .where(and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.examId, examId)
      ));

    const attemptNumber = existingAttempts.length + 1;

    const [attempt] = await db.insert(examAttempts)
      .values({
        examId,
        userId,
        submittedAt: new Date()
      })
      .returning();

    for (const submission of submissions) {
      await db.insert(assignmentSubmissions)
        .values({
          examId,
          userId,
          attemptId: attempt.attemptId,
          questionId: submission.questionId,
          submissionType: submission.submissionType,
          textAnswer: submission.textAnswer,
          linkUrl: submission.linkUrl,
          notes: submission.notes,
          submittedAt: new Date()
        });
    }

    res.status(200).json(
      new ApiResponse(200, {
        attemptId: attempt.attemptId,
        examId,
        attemptNumber, 
        submissionsCount: submissions.length,
        submittedAt: new Date(),
        status: 'submitted',
        message: `Assignment submitted successfully (Attempt #${attemptNumber}). Your submission is now awaiting teacher review.`
      }, 'Assignment exam submitted successfully')
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'An error occurred while submitting assignment');
  }
});

//submit final exam
// Check if exam exists and is final type
// Check if user already submitted this exam
// Create exam attempt
// Save final exam submission
// Send success response
const submitFinalExam = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as UserWithoutPassword;
  const userId = user?.userId;
  if (!userId) {
    throw new ApiError(401, 'User not authenticated');
  }

  try {
    const { examId, linkUrl, notes } = submitFinalExamSchema.parse(req.body);

    const examResults = await db.select()
      .from(examsTable)
      .where(eq(examsTable.examId, examId))
      .limit(1);

    if (!examResults.length || examResults[0].type !== 'final') {
      throw new ApiError(404, 'Final exam not found');
    }

    const existingAttempt = await db.select()
      .from(examAttempts)
      .where(and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.userId, userId)
      ))
      .limit(1);

    if (existingAttempt.length > 0) {
      throw new ApiError(400, 'You have already submitted this final exam. Re-attempts are not allowed for final exams.');
    }

    const [attempt] = await db.insert(examAttempts)
      .values({
        examId,
        userId,
        submittedAt: new Date()
      })
      .returning();

    await db.insert(assignmentSubmissions)
      .values({
        examId,
        userId,
        attemptId: attempt.attemptId,
        submissionType: 'link',
        linkUrl,
        notes,
        submittedAt: new Date()
      });

    res.status(200).json(
      new ApiResponse(200, {
        attemptId: attempt.attemptId,
        examId,
        linkUrl,
        submittedAt: new Date(),
        status: 'submitted',
        totalMarks: examResults[0].totalMarks,
        message: 'Final exam submitted successfully. Your submission is now awaiting teacher grading. Note: Re-attempts are not allowed for final exams.'
      }, 'Final exam submitted successfully')
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError(400, error.errors[0].message);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'An error occurred while submitting final exam');
  }
});

export {
  getExam,
  getCourseExams,
  submitMcqExam,
  submitAssignmentExam,
  submitFinalExam
};
