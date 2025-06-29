// services/examSync.ts
import db from '../db/db_connect';
import { 
  exams, 
  mcqQuestions, 
  mcqOptions, 
  courses, 
  years 
} from '../models';
import { eq, and } from 'drizzle-orm';
import { ALL_EXAM_DATA } from '../data/examQuestions';
import { ExamQuestionData } from '../@types/exam.types';

export async function syncExamData() {
  try {
    console.log('Starting exam sync...');
    const allCourses = await db.select().from(courses);
    
    for (const course of allCourses) {
      console.log(`Syncing exams for course: ${course.courseName}`);
      
      const courseYears = await db.select()
        .from(years)
        .where(eq(years.courseId, course.courseId));
      
      for (const year of courseYears) {
        const yearNumber = parseInt(year.yearName.replace('Year ', ''));
        console.log(`  Processing ${year.yearName} (Year ${yearNumber})`);
        
        const applicableExams = ALL_EXAM_DATA.filter(examData => 
          examData.yearNumber === yearNumber 
        );
        
        for (const examData of applicableExams) {
          await createOrUpdateExam(course.courseId, year.yearId, yearNumber, examData);
        }
      }
    }
    
    console.log('Exam sync completed successfully');
  } catch (error) {
    console.error('Error syncing exam data:', error);
    throw error;
  }
}

async function createOrUpdateExam(
  courseId: number, 
  yearId: number, 
  yearNumber: number,
  examData: ExamQuestionData
) {
  try {

    const existingExam = await db.select()
      .from(exams)
      .where(and(
        eq(exams.courseId, courseId),
        eq(exams.yearId, yearId),
        eq(exams.weekNumber, examData.weekNumber),
        eq(exams.type, examData.type)
      ))
      .limit(1);

    let exam;
    
    if (existingExam.length === 0) {

      [exam] = await db.insert(exams)
        .values({
          courseId,
          yearId,
          weekNumber: examData.weekNumber,
          type: examData.type,
          title: examData.title,
          description: examData.description,
          isActive: true
        })
        .returning();
      
      console.log(`    Created exam: ${examData.title}`);
    } else {

      [exam] = await db.update(exams)
        .set({
          title: examData.title,
          description: examData.description,
          updatedAt: new Date()
        })
        .where(eq(exams.examId, existingExam[0].examId))
        .returning();
      
      console.log(`    Updated exam: ${examData.title}`);
    }

    if (examData.type === 'mcq' && examData.mcqQuestions) {
      await syncMCQQuestions(exam.examId, examData.mcqQuestions);
    }
    
  } catch (error) {
    console.error(`Error creating/updating exam for week ${examData.weekNumber}:`, error);
    throw error;
  }
}

async function syncMCQQuestions(examId: number, questionData: any[]) {

  const existingQuestions = await db.select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));
  
  for (const question of existingQuestions) {
    await db.delete(mcqOptions)
      .where(eq(mcqOptions.questionId, question.questionId));
  }
  
  await db.delete(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));

  for (const questionTemplate of questionData) {
    const [question] = await db.insert(mcqQuestions)
      .values({
        examId,
        question: questionTemplate.question,
        questionOrder: questionTemplate.questionOrder
      })
      .returning();

    for (let i = 0; i < questionTemplate.options.length; i++) {
      await db.insert(mcqOptions)
        .values({
          questionId: question.questionId,
          optionText: questionTemplate.options[i].text,
          isCorrect: questionTemplate.options[i].isCorrect,
          optionOrder: i + 1
        });
    }
  }
}
