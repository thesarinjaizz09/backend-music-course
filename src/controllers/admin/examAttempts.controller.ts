// controllers/admin/examAttempts.controller.ts
import { Request, Response } from 'express';
import  db  from '../../db/db_connect';
import { examAttempts, exams, courses, years, users, userProfiles, assignmentSubmissions, assignmentQuestions } from '../../models';
import { eq, desc, and, isNull, ne } from 'drizzle-orm';

const VALID_EXAM_TYPES = ['mcq', 'assignment', 'final'] as const;
type ExamType = typeof VALID_EXAM_TYPES[number];

function isValidExamType(value: string): value is ExamType {
  return VALID_EXAM_TYPES.includes(value as ExamType);
}

export const getExamAttemptsForReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      examType, 
      courseId, 
      yearId, 
      status = 'all',
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const whereConditions = [];
     whereConditions.push(ne(exams.type, 'mcq'));
    if (examType) {
      if (typeof examType === 'string' && isValidExamType(examType)) {
        whereConditions.push(eq(exams.type, examType));
      } else {
        res.status(400).json({
          success: false,
          message: `Invalid exam type. Must be one of: ${VALID_EXAM_TYPES.join(', ')}`
        });
        return;
      }
    }


    if (courseId) {
      const courseIdNum = Number(courseId);
      if (isNaN(courseIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid course ID'
        });
        return;
      }
      whereConditions.push(eq(exams.courseId, courseIdNum));
    }
    
    if (yearId) {
      const yearIdNum = Number(yearId);
      if (isNaN(yearIdNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid year ID'
        });
        return;
      }
      whereConditions.push(eq(exams.yearId, yearIdNum));
    }

    if (status === 'pending') {
      whereConditions.push(isNull(examAttempts.gradedAt));
    } else if (status === 'graded') {
      whereConditions.push(isNull(examAttempts.gradedAt));
    }

    const examAttemptsData = await db
      .select({
        attemptId: examAttempts.attemptId,
        attemptNumber: examAttempts.attemptNumber,
        passed: examAttempts.passed,
        submittedAt: examAttempts.submittedAt,
        gradedAt: examAttempts.gradedAt,
        gradedBy: examAttempts.gradedBy,
        
        examId: exams.examId,
        examType: exams.type,
        examTitle: exams.title,
        examDescription: exams.description,
        weekNumber: exams.weekNumber,
        totalMarks: exams.totalMarks,
        
        courseId: courses.courseId,
        courseName: courses.courseName,
        yearId: years.yearId,
        yearName: years.yearName,

        userId: users.userId,
        username: users.username,
        email: users.email,
        fullName: userProfiles.fullName,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.examId))
      .innerJoin(courses, eq(exams.courseId, courses.courseId))
      .innerJoin(years, eq(exams.yearId, years.yearId))
      .innerJoin(users, eq(examAttempts.userId, users.userId))
      .leftJoin(userProfiles, eq(users.userId, userProfiles.userId))
      .where(and(...whereConditions))
      .orderBy(desc(examAttempts.submittedAt))
      .limit(Number(limit))
      .offset(offset);

    const detailedAttempts = await Promise.all(
        examAttemptsData.map(async (attempt) => {
            const baseAttempt = {
            attemptId: attempt.attemptId,
            examId: attempt.examId,
            examType: attempt.examType,
            examTitle: attempt.examTitle,
            examDescription: attempt.examDescription,
            course: attempt.courseName,
            year: attempt.yearName,
            week: attempt.weekNumber,
            attemptNumber: attempt.attemptNumber,
            dateTime: attempt.submittedAt,
            userId: attempt.userId,
            username: attempt.username, 
            fullName: attempt.fullName || 'N/A',
            email: attempt.email,
            status: attempt.passed === null ? 'pending' : (attempt.passed ? 'passed' : 'failed'),
            gradedAt: attempt.gradedAt,
            gradedBy: attempt.gradedBy,
            totalMarks: attempt.totalMarks,
            };

           
            if (attempt.examType === 'assignment') {
            const submissions = await db
                .select({
                submissionId: assignmentSubmissions.submissionId,
                questionId: assignmentSubmissions.questionId,
                submissionType: assignmentSubmissions.submissionType,
                textAnswer: assignmentSubmissions.textAnswer,
                linkUrl: assignmentSubmissions.linkUrl,
                notes: assignmentSubmissions.notes,
                isChecked: assignmentSubmissions.isChecked,
                passed: assignmentSubmissions.passed,
                feedback: assignmentSubmissions.feedback,
                question: assignmentQuestions.question,
                questionOrder: assignmentQuestions.questionOrder,
                })
                .from(assignmentSubmissions)
                .leftJoin(assignmentQuestions, eq(assignmentSubmissions.questionId, assignmentQuestions.questionId))
                .where(eq(assignmentSubmissions.attemptId, attempt.attemptId))
                .orderBy(assignmentQuestions.questionOrder);

            const assignmentDetails = submissions.map(sub => ({
                submissionId: sub.submissionId,
                questionId: sub.questionId,
                question: sub.question,
                questionOrder: sub.questionOrder,
                submissionType: sub.submissionType,
                textAnswer: sub.textAnswer,
                linkUrl: sub.linkUrl,
                notes: sub.notes,
                isChecked: sub.isChecked,
                passed: sub.passed,
                feedback: sub.feedback,
            }));

            return {
                ...baseAttempt,
                assignmentDetails
            };
            }

            if (attempt.examType === 'final') {
            const finalExamDetails = await getFinalExamDetails(attempt.attemptId);
            return {
                ...baseAttempt,
                finalExamDetails
            };
            }

            return baseAttempt;
        })
        );

    const totalCountResult = await db
      .select({ count: examAttempts.attemptId })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.examId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    res.status(200).json({
      success: true,
      data: detailedAttempts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCountResult.length,
        totalPages: Math.ceil(totalCountResult.length / Number(limit))
      },
      message: 'Exam attempts retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

async function getAssignmentDetails(attemptId: number) {
  const submissions = await db
    .select({
      submissionId: assignmentSubmissions.submissionId,
      questionId: assignmentSubmissions.questionId,
      submissionType: assignmentSubmissions.submissionType,
      textAnswer: assignmentSubmissions.textAnswer,
      linkUrl: assignmentSubmissions.linkUrl,
      notes: assignmentSubmissions.notes,
      isChecked: assignmentSubmissions.isChecked,
      passed: assignmentSubmissions.passed,
      feedback: assignmentSubmissions.feedback,
      question: assignmentQuestions.question,
      questionOrder: assignmentQuestions.questionOrder,
    })
    .from(assignmentSubmissions)
    .leftJoin(assignmentQuestions, eq(assignmentSubmissions.questionId, assignmentQuestions.questionId))
    .where(eq(assignmentSubmissions.attemptId, attemptId))
    .orderBy(assignmentQuestions.questionOrder);

  return {
    submissions: submissions.map(sub => ({
      submissionId: sub.submissionId,
      questionId: sub.questionId,
      question: sub.question,
      questionOrder: sub.questionOrder,
      submissionType: sub.submissionType,
      textAnswer: sub.textAnswer,
      linkUrl: sub.linkUrl,
      notes: sub.notes,
      isChecked: sub.isChecked,
      passed: sub.passed,
      feedback: sub.feedback,
    }))
  };
}

async function getFinalExamDetails(attemptId: number) {
  const submission = await db
    .select({
      submissionId: assignmentSubmissions.submissionId,
      submissionType: assignmentSubmissions.submissionType,
      linkUrl: assignmentSubmissions.linkUrl,
      notes: assignmentSubmissions.notes,
      totalMarks: assignmentSubmissions.totalMarks,
      isChecked: assignmentSubmissions.isChecked,
      passed: assignmentSubmissions.passed,
      feedback: assignmentSubmissions.feedback,
    })
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.attemptId, attemptId))
    .limit(1);

  const submissionData = submission[0];

  return {
    submissionId: submissionData?.submissionId || null,
    submissionType: submissionData?.submissionType || null,
    linkUrl: submissionData?.linkUrl || null,
    notes: submissionData?.notes || null,
    totalMarks: submissionData?.totalMarks || null,
    isChecked: submissionData?.isChecked || false,
    passed: submissionData?.passed || null,
    feedback: submissionData?.feedback || null,
    requiresCertificate: true,
  };
}
