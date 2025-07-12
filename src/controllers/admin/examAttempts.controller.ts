// controllers/admin/examAttempts.controller.ts
import { Request, Response } from 'express';
import  db  from '../../db/db_connect';
import { examAttempts, exams, courses, years, users, userProfiles, assignmentSubmissions, assignmentQuestions, certificates } from '../../models';
import { eq, desc, and, isNull, ne } from 'drizzle-orm';
import { AdminWithoutPassword } from '../../@types/admin.types';

const VALID_EXAM_TYPES = ['mcq', 'assignment', 'final'] as const;
type ExamType = typeof VALID_EXAM_TYPES[number];

interface AdminRequest extends Request {
  admin?: AdminWithoutPassword;
}

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


export const updateExamAttempt = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { passed, feedback, marks } = req.body;

    if (typeof passed !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'Pass/fail status (passed) is required and must be boolean'
      });
      return;
    }

    const adminId = req.admin?.adminId; 
    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
      return;
    }

    const attemptIdNum = Number(attemptId);
    if (isNaN(attemptIdNum)) {
      res.status(400).json({
        success: false,
        message: 'Invalid attempt ID'
      });
      return;
    }

    const attemptData = await db
      .select({
        attemptId: examAttempts.attemptId,
        examId: examAttempts.examId,
        userId: examAttempts.userId,
        examType: exams.type,
        passed: examAttempts.passed,
        gradedAt: examAttempts.gradedAt,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.examId))
      .where(eq(examAttempts.attemptId, attemptIdNum))
      .limit(1);

    if (attemptData.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
      return;
    }

    const attempt = attemptData[0];

    if (attempt.gradedAt) {
      res.status(400).json({
        success: false,
        message: 'This exam attempt has already been graded'
      });
      return;
    }

    if (attempt.examType === 'final' && passed && typeof marks !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Marks are required for passed final exams'
      });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(examAttempts)
        .set({
          passed: passed,
          gradedAt: new Date(),
          gradedBy: adminId,
        })
        .where(eq(examAttempts.attemptId, attemptIdNum));

      if (attempt.examType === 'assignment' || attempt.examType === 'final') {
        await tx
          .update(assignmentSubmissions)
          .set({
            passed: passed,
            feedback: feedback || null,
            totalMarks: marks ? marks.toString() : null,
            isChecked: true,
            checkedAt: new Date(),
            checkedBy: adminId,
          })
          .where(eq(assignmentSubmissions.attemptId, attemptIdNum));
      }
    });

    res.status(200).json({
      success: true,
      message: 'Exam attempt updated successfully',
      data: {
        attemptId: attemptIdNum,
        passed,
        feedback: feedback || null,
        marks: marks || null,
        gradedAt: new Date(),
        gradedBy: adminId,
      }
    });

  } catch (error) {
    console.error('Error updating exam attempt:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};



export const uploadCertificate = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { certificateUrl } = req.body;

    if (!certificateUrl) {
      res.status(400).json({
        success: false,
        message: 'Certificate URL is required'
      });
      return;
    }

    const adminId = req.admin?.adminId;
    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
      return;
    }

    const attemptIdNum = Number(attemptId);
    if (isNaN(attemptIdNum)) {
      res.status(400).json({
        success: false,
        message: 'Invalid attempt ID'
      });
      return;
    }

     const attemptData = await db
      .select({
        attemptId: examAttempts.attemptId,
        userId: examAttempts.userId,
        examType: exams.type,
        passed: examAttempts.passed,
        gradedAt: examAttempts.gradedAt,
        courseId: exams.courseId,
        yearId: exams.yearId,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.examId))
      .where(eq(examAttempts.attemptId, attemptIdNum))
      .limit(1);

    if (attemptData.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Exam attempt not found'
      });
      return;
    }
    const attempt = attemptData[0];

    if (attempt.examType !== 'final') {
      res.status(400).json({
        success: false,
        message: 'Certificates can only be uploaded for final exams'
      });
      return;
    }

    if (!attempt.gradedAt) {
      res.status(400).json({
        success: false,
        message: 'Please grade the exam first before uploading a certificate'
      });
      return;
    }

     if (attempt.passed === false) {
      res.status(400).json({
        success: false,
        message: 'Cannot upload certificate for a failed candidate'
      });
      return;
    }

    if (attempt.passed === null) {
      res.status(400).json({
        success: false,
        message: 'Exam result is incomplete. Please update the pass/fail status first'
      });
      return;
    }

    const existingCertificate = await db
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, attempt.userId),
          eq(certificates.courseId, attempt.courseId),
          eq(certificates.yearId, attempt.yearId)
        )
      )
      .limit(1);

    if (existingCertificate.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Certificate already exists for this user, course, and year'
      });
      return;
    }

    const certificateId = `CERT_${attempt.courseId}_${attempt.yearId}_${attempt.userId}_${Date.now()}`;

    const [newCertificate] = await db
      .insert(certificates)
      .values({
        certificateId: certificateId,
        userId: attempt.userId,
        courseId: attempt.courseId,
        yearId: attempt.yearId,
        issuedBy: adminId,
        issuedAt: new Date(),
        emailSent: false,
      })
      .returning();

    res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: {
        certificateId: newCertificate.certificateId,
        attemptId: attemptIdNum,
        userId: attempt.userId,
        courseId: attempt.courseId,
        yearId: attempt.yearId,
        certificateUrl,
        issuedAt: newCertificate.issuedAt,
        issuedBy: adminId,
      }
    });

  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
