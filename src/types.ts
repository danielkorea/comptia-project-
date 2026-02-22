export enum ExamDomain {
  ProjectBasics = "Project Basics",
  ProjectConstraints = "Project Constraints",
  CommunicationAndChangeManagement = "Communication and Change Management",
  ProjectToolsAndDocumentation = "Project Tools and Documentation"
}

export interface Question {
  id: string;
  domain: ExamDomain;
  questionEn: string;
  questionZh: string;
  options: {
    key: string;
    textEn: string;
    textZh: string;
  }[];
  correctAnswer: string;
  explanationEn: string;
  explanationZh: string;
}

export interface ExamState {
  currentSet: number | null;
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, string>;
  isFinished: boolean;
  startTime: number | null;
}

export interface ExamResult {
  score: number;
  totalQuestions: number;
  domainBreakdown: Record<ExamDomain, { correct: number; total: number }>;
  aiAnalysis: string;
}
