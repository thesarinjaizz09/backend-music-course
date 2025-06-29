export interface ExamQuestionData {
  courseId?: number; // Will be filled during sync
  yearNumber: number;
  weekNumber: number;
  type: 'mcq' | 'assignment';
  title: string;
  description: string;
  mcqQuestions?: MCQQuestion[];
  assignmentPrompt?: string;
}

export interface MCQQuestion {
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  questionOrder: number;
}

