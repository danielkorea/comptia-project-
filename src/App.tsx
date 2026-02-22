/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Trophy, 
  AlertCircle, 
  Loader2,
  BarChart3,
  RefreshCcw,
  Languages,
  Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { Question, ExamState, ExamDomain, ExamResult } from './types';
import { generateQuestions, generateFinalAnalysis } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QUESTIONS_PER_SET = 90;
const BATCH_SIZE = 5; // Generate in batches to avoid timeout and keep it responsive

export default function App() {
  const [examState, setExamState] = useState<ExamState>({
    currentSet: null,
    questions: [],
    currentIndex: 0,
    userAnswers: {},
    isFinished: false,
    startTime: null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finalResult, setFinalResult] = useState<ExamResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentQuestion = examState.questions[examState.currentIndex];
  const isLastQuestion = examState.currentIndex === QUESTIONS_PER_SET - 1;

  const startExam = async (setNumber: number) => {
    setIsLoading(true);
    setLoadingProgress(0);
    
    // In a real app, we might pre-generate or fetch from a DB.
    // Here we generate the first batch to start quickly.
    try {
      const initialQuestions = await generateQuestions(setNumber, 0, BATCH_SIZE);
      setExamState({
        currentSet: setNumber,
        questions: initialQuestions,
        currentIndex: 0,
        userAnswers: {},
        isFinished: false,
        startTime: Date.now(),
      });
    } catch (error) {
      console.error("Failed to start exam", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answerKey: string) => {
    if (showExplanation) return;
    
    setExamState(prev => ({
      ...prev,
      userAnswers: { ...prev.userAnswers, [currentQuestion.id]: answerKey }
    }));
    setShowExplanation(true);
  };

  const nextQuestion = async () => {
    if (isLastQuestion) {
      finishExam();
      return;
    }

    const nextIndex = examState.currentIndex + 1;
    
    // Check if we need to load more questions
    if (nextIndex >= examState.questions.length) {
      setIsLoading(true);
      try {
        const nextBatch = await generateQuestions(
          examState.currentSet!, 
          examState.questions.length, 
          Math.min(BATCH_SIZE, QUESTIONS_PER_SET - examState.questions.length)
        );
        setExamState(prev => ({
          ...prev,
          questions: [...prev.questions, ...nextBatch],
          currentIndex: nextIndex
        }));
      } catch (error) {
        console.error("Failed to load more questions", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setExamState(prev => ({ ...prev, currentIndex: nextIndex }));
    }
    
    setShowExplanation(false);
  };

  const finishExam = async () => {
    setIsAnalyzing(true);
    
    const correctCount = examState.questions.reduce((acc, q) => {
      return acc + (examState.userAnswers[q.id] === q.correctAnswer ? 1 : 0);
    }, 0);

    const domainBreakdown = Object.values(ExamDomain).reduce((acc, domain) => {
      const domainQuestions = examState.questions.filter(q => q.domain === domain);
      const correct = domainQuestions.filter(q => examState.userAnswers[q.id] === q.correctAnswer).length;
      acc[domain] = { correct, total: domainQuestions.length };
      return acc;
    }, {} as Record<ExamDomain, { correct: number; total: number }>);

    const result: Omit<ExamResult, 'aiAnalysis'> = {
      score: Math.round((correctCount / examState.questions.length) * 100),
      totalQuestions: examState.questions.length,
      domainBreakdown,
    };

    try {
      const aiAnalysis = await generateFinalAnalysis(result);
      setFinalResult({ ...result, aiAnalysis } as ExamResult);
      setExamState(prev => ({ ...prev, isFinished: true }));
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetExam = () => {
    setExamState({
      currentSet: null,
      questions: [],
      currentIndex: 0,
      userAnswers: {},
      isFinished: false,
      startTime: null,
    });
    setFinalResult(null);
    setShowExplanation(false);
  };

  if (examState.currentSet === null) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans p-6 md:p-12 flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl w-full"
        >
          <header className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 text-[10px] font-mono uppercase tracking-widest mb-4">
              <Trophy size={12} /> Certification Prep
            </div>
            <h1 className="text-5xl md:text-7xl font-serif italic tracking-tight mb-4">
              CompTIA Project+
            </h1>
            <p className="text-lg opacity-70 max-w-2xl mx-auto">
              Master project management essentials with our AI-powered bilingual exam simulator. 
              6 full sets, 540 questions, instant analysis.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((set) => (
              <motion.button
                key={set}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startExam(set)}
                className="group relative bg-[#141414] border border-white/10 p-8 text-left transition-all hover:bg-white hover:text-[#0A0A0A]"
              >
                <div className="flex justify-between items-start mb-8">
                  <span className="font-mono text-xs opacity-50 group-hover:opacity-80">SET 0{set}</span>
                  <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-2xl font-serif italic mb-2">Practice Exam {set}</h3>
                <p className="text-sm opacity-60 group-hover:opacity-80">90 Questions • Bilingual • AI Analysis</p>
                <div className="mt-8 h-[1px] w-full bg-white/10 group-hover:bg-[#0A0A0A] opacity-20" />
              </motion.button>
            ))}
          </div>

          <footer className="mt-16 pt-8 border-t border-white/10 text-center text-[10px] font-mono uppercase tracking-widest opacity-40">
            Professional Grade Simulator • Powered by Gemini 3.1 Pro
          </footer>
        </motion.div>

        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
            >
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-mono text-xs uppercase tracking-widest">Generating Exam Content...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (examState.isFinished && finalResult) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          <header className="flex justify-between items-end mb-12 border-b border-white/20 pb-8">
            <div>
              <h2 className="text-4xl font-serif italic mb-2">Exam Results</h2>
              <p className="font-mono text-xs uppercase tracking-widest opacity-50">Set 0{examState.currentSet} • Completed</p>
            </div>
            <button 
              onClick={resetExam}
              className="flex items-center gap-2 px-6 py-3 bg-white text-[#0A0A0A] font-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all"
            >
              <RefreshCcw size={14} /> New Exam
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-[#141414] border border-white/10 p-8 text-center">
                <div className="text-sm font-mono uppercase tracking-widest opacity-50 mb-2">Final Score</div>
                <div className="text-7xl font-serif italic mb-4">{finalResult.score}%</div>
                <div className={cn(
                  "inline-block px-4 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest",
                  finalResult.score >= 75 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                )}>
                  {finalResult.score >= 75 ? "PASS" : "FAIL"}
                </div>
              </div>

              <div className="bg-[#141414] border border-white/10 p-8">
                <h4 className="font-mono text-xs uppercase tracking-widest opacity-50 mb-6 flex items-center gap-2">
                  <BarChart3 size={14} /> Domain Breakdown
                </h4>
                <div className="space-y-6">
                  {Object.entries(finalResult.domainBreakdown).map(([domain, data]) => (
                    <div key={domain}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-medium">{domain}</span>
                        <span className="font-mono">{data.correct}/{data.total}</span>
                      </div>
                      <div className="h-1 w-full bg-white/5">
                        <div 
                          className="h-full bg-white" 
                          style={{ width: `${(data.correct / data.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-[#141414] border border-white/10 p-8 h-full">
                <h4 className="font-mono text-xs uppercase tracking-widest opacity-50 mb-6 flex items-center gap-2">
                  <AlertCircle size={14} /> AI Performance Analysis
                </h4>
                <div className="prose prose-sm prose-invert max-w-none prose-headings:font-serif prose-headings:italic">
                  <Markdown>{finalResult.aiAnalysis}</Markdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#141414] border-b border-white/10 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={resetExam} className="hover:opacity-60 transition-opacity">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-serif italic">Exam Set 0{examState.currentSet}</h1>
            <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest opacity-50">
              <span>Question {examState.currentIndex + 1} of {QUESTIONS_PER_SET}</span>
              <span className="h-3 w-[1px] bg-white/20" />
              <span className="flex items-center gap-1"><Clock size={10} /> {Math.floor((Date.now() - (examState.startTime || 0)) / 60000)}m</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[10px] font-mono uppercase tracking-widest">
            <Languages size={12} /> Bilingual Mode
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-white/5">
        <motion.div 
          className="h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${((examState.currentIndex + 1) / QUESTIONS_PER_SET) * 100}%` }}
        />
      </div>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {currentQuestion ? (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              {/* Domain Tag */}
              <div className="inline-block px-3 py-1 border border-[#141414] text-[10px] font-mono uppercase tracking-widest">
                {currentQuestion.domain}
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <h2 className="text-xl md:text-2xl font-serif italic leading-tight">
                  {currentQuestion.questionEn}
                </h2>
                <p className="text-base opacity-60 leading-relaxed">
                  {currentQuestion.questionZh}
                </p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4 mt-12">
                {currentQuestion.options.map((option) => {
                  const isSelected = examState.userAnswers[currentQuestion.id] === option.key;
                  const isCorrect = option.key === currentQuestion.correctAnswer;
                  const showResult = showExplanation;

                  return (
                    <button
                      key={option.key}
                      onClick={() => handleAnswer(option.key)}
                      disabled={showExplanation}
                      className={cn(
                        "group relative flex items-start gap-4 p-6 border transition-all text-left",
                        !showResult && "border-white/20 hover:bg-white hover:text-[#0A0A0A]",
                        showResult && isCorrect && "bg-emerald-500/10 border-emerald-500 text-emerald-400",
                        showResult && isSelected && !isCorrect && "bg-red-500/10 border-red-500 text-red-400",
                        showResult && !isSelected && !isCorrect && "border-white/5 opacity-40"
                      )}
                    >
                      <span className="font-mono text-xs mt-1">{option.key}.</span>
                      <div className="flex-1">
                        <div className="text-base font-medium mb-1">{option.textEn}</div>
                        <div className="text-sm opacity-70">{option.textZh}</div>
                      </div>
                      {showResult && isCorrect && <CheckCircle2 size={20} className="text-emerald-400 mt-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation / Analysis */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-8 bg-[#141414] border border-white/10 space-y-6"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
                      <AlertCircle size={14} /> Explanation & Analysis
                    </div>
                    <div className="space-y-4">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <div className="mb-6">
                          <Markdown>{currentQuestion.explanationEn}</Markdown>
                        </div>
                        <div className="opacity-70 border-t border-white/5 pt-6">
                          <Markdown>{currentQuestion.explanationZh}</Markdown>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={nextQuestion}
                      className="w-full py-4 bg-white text-[#0A0A0A] font-mono text-xs uppercase tracking-widest hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      {isLastQuestion ? "Finish Exam" : "Next Question"} <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-mono text-xs uppercase tracking-widest">Loading Question...</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer / Progress Info */}
      <footer className="bg-[#0A0A0A] border-t border-white/10 px-6 py-3 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest opacity-40 text-white">
        <span>CompTIA Project+ PK0-005</span>
        <span>AI Assisted Learning</span>
      </footer>

      <AnimatePresence>
        {(isLoading || isAnalyzing) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center"
          >
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="font-mono text-xs uppercase tracking-widest">
              {isAnalyzing ? "Analyzing Performance..." : "Generating Next Batch..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
