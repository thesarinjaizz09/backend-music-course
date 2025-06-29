import { ExamQuestionData } from "../@types/exam.types";

// Year 1 - Week 13 Exam Data
export const YEAR_1_WEEK_13_QUESTIONS: ExamQuestionData[] = [
  {
    yearNumber: 1,
    weekNumber: 13,
    type: 'mcq',
    title: 'Mid-Term MCQ Assessment - Week 13',
    description: 'Multiple choice questions covering weeks 1-13 content - Basic Music Theory',
    mcqQuestions: [
      {
        question: "What is the basic element of music according to Indian music theory?",
        options: [
          { text: "Taal", isCorrect: false },
          { text: "Naad", isCorrect: true },
          { text: "Laya", isCorrect: false },
          { text: "Swara", isCorrect: false }
        ],
        questionOrder: 1
      },
      {
        question: "Ahata Naad is produced by:",
        options: [
          { text: "Meditation", isCorrect: false },
          { text: "Silence", isCorrect: false },
          { text: "Striking", isCorrect: true },
          { text: "Breathing", isCorrect: false }
        ],
        questionOrder: 2
      },
      {
        question: "Anahata Naad is produced:",
        options: [
          { text: "By instruments", isCorrect: false },
          { text: "Without striking", isCorrect: true },
          { text: "With clapping", isCorrect: false },
          { text: "By speaking", isCorrect: false }
        ],
        questionOrder: 3
      },
      {
        question: "The term 'Laya' refers to:",
        options: [
          { text: "Beat", isCorrect: false },
          { text: "Rhythm", isCorrect: false },
          { text: "Speed or time-division", isCorrect: true },
          { text: "Melody", isCorrect: false }
        ],
        questionOrder: 4
      },
      {
        question: "Which of the following best defines Taal?",
        options: [
          { text: "Sequence of notes", isCorrect: false },
          { text: "Cycle of beats", isCorrect: true },
          { text: "A Raga", isCorrect: false },
          { text: "A note pattern", isCorrect: false }
        ],
        questionOrder: 5
      },
      {
        question: "The starting point of a Taal or Theka is known as:",
        options: [
          { text: "Khaali", isCorrect: false },
          { text: "Sam", isCorrect: true },
          { text: "Taali", isCorrect: false },
          { text: "Laya", isCorrect: false }
        ],
        questionOrder: 6
      },
      {
        question: "Theka is played on:",
        options: [
          { text: "Veena", isCorrect: false },
          { text: "Tabla or Pakhawaj", isCorrect: true },
          { text: "Sitar", isCorrect: false },
          { text: "Flute", isCorrect: false }
        ],
        questionOrder: 7
      },
      {
        question: "What does 'Naad' literally mean in music theory?",
        options: [
          { text: "Language", isCorrect: false },
          { text: "Sound", isCorrect: true },
          { text: "Rhythm", isCorrect: false },
          { text: "Time", isCorrect: false }
        ],
        questionOrder: 8
      }
    ]
  },
  {
    yearNumber: 1,
    weekNumber: 13,
    type: 'assignment',
    title: 'Practical Assignment - Week 13',
    description: 'Practical assignment covering basic Tabla concepts',
    assignmentPrompt: 'Write one Kaida in Bhatkhande Notation System with two variations and Tihayi. Also explain the parts of a Tabla with a diagram.'
  }
];

// Year 2 - Week 13 Exam Data
export const YEAR_2_WEEK_13_QUESTIONS: ExamQuestionData[] = [
  {
    yearNumber: 2,
    weekNumber: 13,
    type: 'mcq',
    title: 'Advanced Theory Assessment - Week 13',
    description: 'Advanced concepts including Gharana knowledge and composition theory',
    mcqQuestions: [
      {
        question: "The Ajrada Gharana originated in which Indian state?",
        options: [
          { text: "Rajasthan", isCorrect: false },
          { text: "Uttar Pradesh", isCorrect: true },
          { text: "Madhya Pradesh", isCorrect: false },
          { text: "Maharashtra", isCorrect: false }
        ],
        questionOrder: 1
      },
      {
        question: "What is a key rhythmic characteristic of the Ajrada Gharana?",
        options: [
          { text: "Fast-paced Teen Taal", isCorrect: false },
          { text: "Simple bol patterns", isCorrect: false },
          { text: "Use of jhul (swaying pattern) and bayan pressure variation", isCorrect: true },
          { text: "Vocal syllables in tabla", isCorrect: false }
        ],
        questionOrder: 2
      },
      {
        question: "How many basic swaras (notes) are there in Indian classical music?",
        options: [
          { text: "5", isCorrect: false },
          { text: "6", isCorrect: false },
          { text: "7", isCorrect: true },
          { text: "8", isCorrect: false }
        ],
        questionOrder: 3
      },
      {
        question: "What does the term 'Shruti' mean in Indian classical music?",
        options: [
          { text: "Beat cycle", isCorrect: false },
          { text: "Ornamentation", isCorrect: false },
          { text: "Microtonal pitch interval", isCorrect: true },
          { text: "Note pattern", isCorrect: false }
        ],
        questionOrder: 4
      },
      {
        question: "What does the term 'Kaida' literally mean?",
        options: [
          { text: "Pattern", isCorrect: false },
          { text: "Rule or theme", isCorrect: true },
          { text: "Speed", isCorrect: false },
          { text: "Ending phrase", isCorrect: false }
        ],
        questionOrder: 5
      }
    ]
  },
  {
    yearNumber: 2,
    weekNumber: 13,
    type: 'assignment',
    title: 'Advanced Practical Assignment - Week 13',
    description: 'Advanced composition and theoretical analysis',
    assignmentPrompt: 'Analyze a specific Gharana style and demonstrate advanced Tabla compositions with detailed theoretical explanation.'
  }
];

export const YEAR_1_FINAL_EXAM: ExamQuestionData[] = [
  {
    yearNumber: 1,
    weekNumber: 52,
    type: 'mcq',
    title: 'Year 1 Final MCQ Exam - Week 52',
    description: 'Comprehensive multiple choice questions covering Year 1 content',
    mcqQuestions: [
      {
        question: "What is the basic element of music according to Indian music theory?",
        options: [
          { text: "Taal", isCorrect: false },
          { text: "Naad", isCorrect: true },
          { text: "Laya", isCorrect: false },
          { text: "Swara", isCorrect: false }
        ],
        questionOrder: 1
      },
      // Add more Year 1 specific final exam questions
    ]
  },
  {
    yearNumber: 1,
    weekNumber: 52,
    type: 'assignment',
    title: 'Year 1 Final Assignment - Week 52',
    description: 'Year 1 comprehensive practical assignment',
    assignmentPrompt: 'Year 1 specific final assignment prompt covering basic concepts learned throughout the year.'
  }
];

export const YEAR_2_FINAL_EXAM: ExamQuestionData[] = [
  {
    yearNumber: 2,
    weekNumber: 52,
    type: 'mcq',
    title: 'Year 2 Final MCQ Exam - Week 52',
    description: 'Comprehensive multiple choice questions covering Year 2 advanced content',
    mcqQuestions: [
      {
        question: "Advanced Year 2 question about complex Gharana concepts...",
        options: [
          { text: "Option A", isCorrect: false },
          { text: "Option B", isCorrect: true },
          { text: "Option C", isCorrect: false },
          { text: "Option D", isCorrect: false }
        ],
        questionOrder: 1
      },
      // Add more Year 2 specific final exam questions
    ]
  },
  {
    yearNumber: 2,
    weekNumber: 52,
    type: 'assignment',
    title: 'Year 2 Final Assignment - Week 52',
    description: 'Year 2 advanced comprehensive practical assignment',
    assignmentPrompt: 'Year 2 specific final assignment prompt covering advanced concepts.'
  }
];

// Compile all exam data
export const ALL_EXAM_DATA: ExamQuestionData[] = [
  ...YEAR_1_WEEK_13_QUESTIONS,
  ...YEAR_2_WEEK_13_QUESTIONS,
  // Add Week 26 questions (template for now)
  {
    yearNumber: 1,
    weekNumber: 26,
    type: 'mcq',
    title: 'Mid-Year MCQ Assessment - Week 26',
    description: 'Multiple choice questions covering weeks 14-26 content',
    mcqQuestions: [
      // Add specific Week 26 questions here
      {
        question: "Sample Week 26 Question - Advanced Taal concepts",
        options: [
          { text: "Option A", isCorrect: false },
          { text: "Option B", isCorrect: true },
          { text: "Option C", isCorrect: false },
          { text: "Option D", isCorrect: false }
        ],
        questionOrder: 1
      }
    ]
  },
  {
    yearNumber: 1,
    weekNumber: 26,
    type: 'assignment',
    title: 'Mid-Year Practical Assignment - Week 26',
    description: 'Advanced practical assignment for mid-year assessment',
    assignmentPrompt: 'Demonstrate advanced Tabla techniques and provide theoretical analysis of complex compositions.'
  },
  // Week 39 questions (template)
  {
    yearNumber: 1,
    weekNumber: 39,
    type: 'mcq',
    title: 'Pre-Final MCQ Assessment - Week 39',
    description: 'Multiple choice questions covering weeks 27-39 content',
    mcqQuestions: [
      {
        question: "Sample Week 39 Question - Expert level concepts",
        options: [
          { text: "Option A", isCorrect: true },
          { text: "Option B", isCorrect: false },
          { text: "Option C", isCorrect: false },
          { text: "Option D", isCorrect: false }
        ],
        questionOrder: 1
      }
    ]
  },
  {
    yearNumber: 1,
    weekNumber: 39,
    type: 'assignment',
    title: 'Advanced Practical Assignment - Week 39',
    description: 'Complex assignment preparing for final evaluation',
    assignmentPrompt: 'Create and perform complex Tabla compositions with complete theoretical documentation and analysis.'
  },
  ...YEAR_1_FINAL_EXAM, 
  ...YEAR_2_FINAL_EXAM,   
];
