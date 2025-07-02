// services/examSync.ts 
import db from '../db/db_connect';
import { 
  exams, 
  mcqQuestions, 
  mcqOptions, 
  assignmentQuestions,
  finalExamSections,
  finalExamQuestions,
  courses, 
  years 
} from '../models';
import { eq, and, inArray } from 'drizzle-orm';
import { ALL_EXAM_DATA } from '../data/examQuestions';
import { ExamQuestionData } from '../@types/exam.types';

export async function syncExamData() {
  try {
    console.log('Starting comprehensive exam sync...');
    const allCourses = await db.select().from(courses);
    
    for (const course of allCourses) {
      console.log(`Syncing exams for course: ${course.courseName}`);
      
      const courseYears = await db.select()
        .from(years)
        .where(eq(years.courseId, course.courseId));
      
      for (const year of courseYears) {
        const yearNumber = parseInt(year.yearName.replace('Year ', ''));
        console.log(`  Processing ${year.yearName} (Year ${yearNumber})`);
        
        // Get exams from data that should exist for this year
        const applicableExams = ALL_EXAM_DATA.filter(examData => 
          examData.yearNumber === yearNumber 
        );
        
        // Get existing exams from database
        const existingExams = await db.select()
          .from(exams)
          .where(and(
            eq(exams.courseId, course.courseId),
            eq(exams.yearId, year.yearId)
          ));
        
        // Create/Update exams that should exist
        for (const examData of applicableExams) {
          await createOrUpdateExam(course.courseId, year.yearId, yearNumber, examData);
        }
        
        // Delete exams that no longer exist in data
        await deleteRemovedExams(course.courseId, year.yearId, applicableExams, existingExams);
      }
    }
    
    console.log('Comprehensive exam sync completed successfully');
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
      // Create new exam
      [exam] = await db.insert(exams)
        .values({
          courseId,
          yearId,
          weekNumber: examData.weekNumber,
          type: examData.type,
          title: examData.title,
          description: examData.description,
          totalMarks: examData.totalMarks,
          isActive: true
        })
        .returning();
      
      console.log(`    Created exam: ${examData.title}`);
    } else {
      // Update existing exam
      [exam] = await db.update(exams)
        .set({
          title: examData.title,
          description: examData.description,
          totalMarks: examData.totalMarks,
          updatedAt: new Date()
        })
        .where(eq(exams.examId, existingExam[0].examId))
        .returning();
      
      console.log(`    Updated exam: ${examData.title}`);
    }

    // Handle different exam types
    switch (examData.type) {
      case 'mcq':
        if (examData.mcqQuestions) {
          await syncMCQQuestions(exam.examId, examData.mcqQuestions);
        }
        break;
      case 'assignment':
        if (examData.assignmentQuestions) {
          await syncAssignmentQuestions(exam.examId, examData.assignmentQuestions);
        }
        break;
      case 'final':
        if (examData.sections) {
          await syncFinalExamSections(exam.examId, examData.sections);
        }
        break;
    }
    
  } catch (error) {
    console.error(`Error creating/updating exam for week ${examData.weekNumber}:`, error);
    throw error;
  }
}

async function syncMCQQuestions(examId: number, questionData: any[]) {
  // Delete existing questions and options
  const existingQuestions = await db.select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));
  
  for (const question of existingQuestions) {
    await db.delete(mcqOptions)
      .where(eq(mcqOptions.questionId, question.questionId));
  }
  
  await db.delete(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));

  // Insert new questions
  for (const questionTemplate of questionData) {
    const [question] = await db.insert(mcqQuestions)
      .values({
        examId,
        question: questionTemplate.question,
        questionOrder: questionTemplate.questionOrder
      })
      .returning();

    // Insert options
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

async function syncAssignmentQuestions(examId: number, questionData: any[]) {
  // Delete existing assignment questions
  await db.delete(assignmentQuestions)
    .where(eq(assignmentQuestions.examId, examId));

  // Insert new assignment questions
  for (const questionTemplate of questionData) {
    await db.insert(assignmentQuestions)
      .values({
        examId,
        question: questionTemplate.question,
        questionOrder: questionTemplate.questionOrder
      });
  }
}

async function syncFinalExamSections(examId: number, sectionsData: any[]) {
  // Delete existing final exam sections and questions
  const existingSections = await db.select()
    .from(finalExamSections)
    .where(eq(finalExamSections.examId, examId));
  
  for (const section of existingSections) {
    await db.delete(finalExamQuestions)
      .where(eq(finalExamQuestions.sectionId, section.sectionId));
  }
  
  await db.delete(finalExamSections)
    .where(eq(finalExamSections.examId, examId));

  // Insert new sections and questions
  for (let i = 0; i < sectionsData.length; i++) {
    const sectionData = sectionsData[i];
    
    const [section] = await db.insert(finalExamSections)
      .values({
        examId,
        name: sectionData.name,
        description: sectionData.description,
        marks: sectionData.marks,
        instructions: sectionData.instructions,
        sectionOrder: i + 1
      })
      .returning();

    // Insert questions for this section
    for (const questionData of sectionData.questions) {
      await db.insert(finalExamQuestions)
        .values({
          sectionId: section.sectionId,
          examId,
          type: questionData.type,
          text: questionData.text,
          questionOrder: questionData.order,
          marks: questionData.marks,
          isCompulsory: questionData.isCompulsory || false,
          requiresDiagram: questionData.requiresDiagram || false,
          requiresMatching: questionData.requiresMatching || false,
          requiresNotation: questionData.requiresNotation || false,
          requiresVariations: questionData.requiresVariations || false,
          requiresTihayi: questionData.requiresTihayi || false,
          requiresBiography: questionData.requiresBiography || false,
          requiresDefinition: questionData.requiresDefinition || false,
          requiresExamples: questionData.requiresExamples || false,
          matchingPairs: questionData.matchingPairs ? JSON.stringify(questionData.matchingPairs) : null
        });
    }
  }
}

async function deleteRemovedExams(
  courseId: number, 
  yearId: number, 
  applicableExams: ExamQuestionData[], 
  existingExams: any[]
) {
  const examKeysFromData = applicableExams.map(e => `${e.weekNumber}-${e.type}`);
  const examsToDelete = existingExams.filter(e => 
    !examKeysFromData.includes(`${e.weekNumber}-${e.type}`)
  );

  for (const examToDelete of examsToDelete) {
    console.log(`    Deleting removed exam: ${examToDelete.title}`);
    
    // Delete related data first
    await deleteExamData(examToDelete.examId);
    
    // Delete the exam
    await db.delete(exams)
      .where(eq(exams.examId, examToDelete.examId));
  }
}

async function deleteExamData(examId: number) {
  // Delete MCQ data
  const mcqQuestionsToDelete = await db.select()
    .from(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));
  
  for (const question of mcqQuestionsToDelete) {
    await db.delete(mcqOptions)
      .where(eq(mcqOptions.questionId, question.questionId));
  }
  
  await db.delete(mcqQuestions)
    .where(eq(mcqQuestions.examId, examId));

  // Delete assignment questions
  await db.delete(assignmentQuestions)
    .where(eq(assignmentQuestions.examId, examId));

  // Delete final exam data
  const finalSectionsToDelete = await db.select()
    .from(finalExamSections)
    .where(eq(finalExamSections.examId, examId));
  
  for (const section of finalSectionsToDelete) {
    await db.delete(finalExamQuestions)
      .where(eq(finalExamQuestions.sectionId, section.sectionId));
  }
  
  await db.delete(finalExamSections)
    .where(eq(finalExamSections.examId, examId));
}
