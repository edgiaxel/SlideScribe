import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Award,
  Layers,
  HelpCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ViewMode, Note, StudySet, QuizQuestion, Flashcard } from '../types';
import { notesApi } from '../api/notesApi';

interface StudyViewProps {
  note: Note;
  notes: Note[];
  onNavigate: (view: ViewMode) => void;
  onSelectNote: (note: Note) => void;
}

export const StudyView: React.FC<StudyViewProps> = ({
  note,
  notes,
  onNavigate,
  onSelectNote,
}) => {
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcards'>('quiz');

  // Study Set data and loading states
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Depth & Custom Prompt controls
  const [quizDepth, setQuizDepth] = useState<'simple' | 'in_depth'>('simple');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [activeAppliedPrompt, setActiveAppliedPrompt] = useState<string>('');
  const [activeAppliedDepth, setActiveAppliedDepth] = useState<'simple' | 'in_depth'>('simple');

  // Quiz state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Load study set for current note
  const loadStudyMaterials = useCallback(
    async (
      forceRegenerate: boolean = false,
      opts?: { depth?: 'simple' | 'in_depth'; custom_prompt?: string }
    ) => {
      if (!note?.id) return;

      if (forceRegenerate) {
        setIsRegenerating(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const requestedDepth = opts?.depth ?? quizDepth;
      const requestedPrompt = opts?.custom_prompt ?? customPrompt;

      try {
        const data = await notesApi.getStudySet(note.id, forceRegenerate, {
          depth: requestedDepth,
          custom_prompt: requestedPrompt.trim() ? requestedPrompt.trim() : undefined,
        });
        setStudySet(data);
        setActiveAppliedDepth(requestedDepth);
        setActiveAppliedPrompt(requestedPrompt.trim());

        // Reset study progression states
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setIsAnswerRevealed(false);
        setScore(0);
        setIsQuizFinished(false);
        setCardIndex(0);
        setIsCardFlipped(false);
      } catch (err: any) {
        console.error('Failed to load study set:', err);
        setErrorMessage(
          err.message || 'Unable to generate study materials. Please verify the backend and Gemma inference path.'
        );
      } finally {
        setIsLoading(false);
        setIsRegenerating(false);
      }
    },
    [note?.id, quizDepth, customPrompt]
  );

  useEffect(() => {
    loadStudyMaterials(false);
  }, [note?.id]);

  // Quiz Interactions
  const questions: QuizQuestion[] = studySet?.quiz_questions || [];
  const currentQ: QuizQuestion | undefined = questions[currentQuestionIndex];

  const handleSelectOption = (optId: string) => {
    if (isAnswerRevealed || !currentQ) return;
    setSelectedOption(optId);
    setIsAnswerRevealed(true);

    const chosen = currentQ.options.find((o) => o.id === optId);
    if (chosen?.correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScore(0);
    setIsQuizFinished(false);
  };

  // Flashcard Interactions
  const flashcards: Flashcard[] = studySet?.flashcards || [];
  const currentCard: Flashcard | undefined = flashcards[cardIndex];

  const handleNextCard = () => {
    setIsCardFlipped(false);
    if (flashcards.length > 0) {
      setCardIndex((prev) => (prev + 1) % flashcards.length);
    }
  };

  const handlePrevCard = () => {
    setIsCardFlipped(false);
    if (flashcards.length > 0) {
      setCardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
      {/* Top Header Bar & Mode Switcher */}
      <header
        className="sticky top-0 z-30 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <button
            onClick={() => onNavigate('editor')}
            className="inline-flex items-center gap-1.5 font-medium hover:underline transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Editor</span>
          </button>
          <span className="text-gray-400">·</span>

          {/* Note Switcher Dropdown */}
          {notes && notes.length > 1 ? (
            <select
              value={note.id}
              onChange={(e) => {
                const found = notes.find((n) => n.id === e.target.value);
                if (found) onSelectNote(found);
              }}
              className="text-xs font-semibold rounded-md border px-2 py-1 bg-transparent cursor-pointer focus:outline-none"
              style={{
                borderColor: 'var(--border-strong)',
                color: 'var(--text-main)',
              }}
            >
              {notes.map((n) => (
                <option key={n.id} value={n.id} className="bg-white dark:bg-stone-900">
                  {n.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-semibold truncate max-w-[200px]" style={{ color: 'var(--text-main)' }}>
              {note?.title || 'Lecture Note'}
            </span>
          )}

          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--bg-surface-high)',
              color: 'var(--text-main)',
            }}
          >
            {note?.workspace || 'General'}
          </span>
        </div>

        {/* Tab Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Custom Options Toggle */}
          <button
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isOptionsOpen
                ? 'bg-[#DCE8D6] text-[#33452F] border-emerald-400'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            style={
              !isOptionsOpen
                ? {
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }
                : undefined
            }
            title="Configure quiz depth and custom focus prompt"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Prompt & Depth</span>
            {isOptionsOpen ? (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            )}
          </button>

          {/* Quick Regenerate CTA */}
          <button
            onClick={() => loadStudyMaterials(true)}
            disabled={isLoading || isRegenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
            title="Regenerate grounded quiz questions and flashcards with Gemma"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
          </button>

          <div
            className="inline-flex items-center p-1 rounded-lg border text-xs"
            style={{
              backgroundColor: 'var(--bg-surface-low)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'quiz'
                  ? 'bg-white dark:bg-stone-800 text-[#324B55] dark:text-emerald-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Quiz ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === 'flashcards'
                  ? 'bg-white dark:bg-stone-800 text-[#324B55] dark:text-emerald-300 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Flashcards ({flashcards.length})
            </button>
          </div>
        </div>
      </header>

      {/* Expandable Quiz Options & Custom Prompt Bar */}
      {isOptionsOpen && (
        <div
          className="p-5 rounded-2xl border shadow-xs flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                Study Generation Options
              </h3>
            </div>
            <span className="text-[11px] text-gray-500">Tailors questions with local Gemma model</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Depth Toggle */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>
                Quiz Scope & Depth
              </label>
              <div
                className="inline-flex items-center p-1 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-low)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setQuizDepth('simple')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                    quizDepth === 'simple'
                      ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs font-semibold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Standard (3-4 Qs)
                </button>
                <button
                  type="button"
                  onClick={() => setQuizDepth('in_depth')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-medium text-xs transition-all ${
                    quizDepth === 'in_depth'
                      ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-300 shadow-xs font-semibold'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  In-Depth (5-6+ Qs)
                </button>
              </div>
            </div>

            {/* Custom Focus Prompt Input */}
            <div className="md:col-span-8 flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>
                Custom Topic Focus / Special Instructions (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Focus on ARIMA assumptions, mathematical formulations, or midterm exam edge cases..."
                  className="flex-1 px-3 py-2 rounded-lg border text-xs bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  style={{
                    borderColor: 'var(--border-strong)',
                    color: 'var(--text-main)',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      loadStudyMaterials(true, { depth: quizDepth, custom_prompt: customPrompt });
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => loadStudyMaterials(true, { depth: quizDepth, custom_prompt: customPrompt })}
                  disabled={isLoading || isRegenerating}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors shrink-0 disabled:opacity-50"
                >
                  Apply & Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Settings Badges Bar */}
      {(activeAppliedPrompt || activeAppliedDepth === 'in_depth') && (
        <div
          className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border text-xs"
          style={{
            backgroundColor: 'var(--bg-surface-low)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <span className="font-semibold text-emerald-800 dark:text-emerald-400">
            Active Study Configuration:
          </span>
          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
            {activeAppliedDepth === 'in_depth' ? 'In-Depth Mode (5+ Questions)' : 'Standard Mode'}
          </span>
          {activeAppliedPrompt && (
            <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 truncate max-w-md">
              Focus: "{activeAppliedPrompt}"
            </span>
          )}
        </div>
      )}

      {/* Loading State */}
      {(isLoading || isRegenerating) && (
        <div
          className="w-full max-w-2xl mx-auto p-12 rounded-2xl border flex flex-col items-center justify-center text-center gap-4 shadow-xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#DCE8D6] text-[#33452F] animate-pulse">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-serif font-semibold" style={{ color: 'var(--text-main)' }}>
              {isRegenerating ? 'Synthesizing Tailored Study Set...' : 'Generating Grounded Study Tools...'}
            </h2>
            <p className="text-xs max-w-md leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Gemma 3 4B is analyzing <span className="font-medium text-gray-700 dark:text-gray-300">"{note?.title}"</span>{' '}
              {customPrompt.trim() ? `with focus on "${customPrompt.trim()}"` : ''} and extracting verifiable questions and flashcards.
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorMessage && !isLoading && (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 flex flex-col gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Study Material Generation Error</span>
          </div>
          <p className="leading-relaxed">{errorMessage}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => loadStudyMaterials(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Generation</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Content: Quiz or Flashcards */}
      {!isLoading && !errorMessage && studySet && (
        <>
          {activeTab === 'quiz' ? (
            /* QUIZ MODE */
            <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
              {questions.length === 0 ? (
                <div
                  className="p-8 rounded-xl border text-center flex flex-col items-center gap-3 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <HelpCircle className="w-6 h-6 text-gray-400" />
                  <p style={{ color: 'var(--text-muted)' }}>No quiz questions were generated for this note.</p>
                  <button
                    onClick={() => loadStudyMaterials(true)}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors"
                  >
                    Generate Quiz Now
                  </button>
                </div>
              ) : isQuizFinished ? (
                /* Quiz Finished Celebration Screen */
                <article
                  className="p-8 sm:p-10 rounded-2xl border text-center flex flex-col items-center gap-6 shadow-2xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#DCE8D6] text-[#33452F]">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-serif font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                      Quiz Completed!
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      You scored <span className="font-bold text-emerald-700 dark:text-emerald-400">{score}</span> out of{' '}
                      <span className="font-bold">{questions.length}</span> (
                      {Math.round((score / questions.length) * 100)}%)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRestartQuiz}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('flashcards')}
                      className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{
                        borderColor: 'var(--border-strong)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <span>Study Flashcards</span>
                    </button>
                  </div>
                </article>
              ) : (
                /* Active Question */
                currentQ && (
                  <div className="flex flex-col gap-5">
                    {/* Progress Tracker */}
                    <div className="flex items-center justify-between text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span>·</span>
                        <span className="text-emerald-800 dark:text-emerald-400 font-medium">{currentQ.topic}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span>Score: {score}</span>
                        <span>·</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                          {currentQ.source_ref || 'Note Content'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Question Card */}
                    <article
                      className="p-6 sm:p-8 rounded-xl border shadow-2xs flex flex-col gap-6"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <h2 className="text-xl sm:text-2xl font-serif font-semibold leading-snug" style={{ color: 'var(--text-main)' }}>
                        {currentQ.question}
                      </h2>

                      {/* Answer Choices */}
                      <div className="flex flex-col gap-3">
                        {currentQ.options.map((option) => {
                          const isSelected = selectedOption === option.id;
                          let optionStyle: React.CSSProperties = {
                            backgroundColor: 'var(--bg-surface-low)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-main)',
                          };

                          if (isAnswerRevealed) {
                            if (option.correct) {
                              optionStyle = {
                                backgroundColor: '#DCE8D6',
                                borderColor: '#4A5C43',
                                color: '#21331D',
                              };
                            } else if (isSelected && !option.correct) {
                              optionStyle = {
                                backgroundColor: '#FDE8E8',
                                borderColor: '#E02424',
                                color: '#9B1C1C',
                              };
                            }
                          }

                          return (
                            <button
                              key={option.id}
                              disabled={isAnswerRevealed}
                              onClick={() => handleSelectOption(option.id)}
                              className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                                !isAnswerRevealed ? 'cursor-pointer hover:shadow-xs hover:border-emerald-600/40' : 'cursor-default'
                              }`}
                              style={optionStyle}
                            >
                              <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-black/10">
                                {isAnswerRevealed && option.correct ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-800" />
                                ) : (
                                  option.id
                                )}
                              </div>
                              <div className="flex-1 text-sm leading-relaxed">{option.text}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Answer Feedback & Grounding Explanation */}
                      {isAnswerRevealed && (
                        <div
                          className="p-4 rounded-xl border flex flex-col gap-2 text-xs transition-all"
                          style={{
                            backgroundColor: 'var(--bg-surface-low)',
                            borderColor: 'var(--border-strong)',
                          }}
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Grounding Explanation</span>
                          </div>
                          <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                            {currentQ.explanation}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                            <span>Source Reference:</span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              {currentQ.source_ref || 'Extracted Note Content'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Next Question Navigation */}
                      {isAnswerRevealed && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={handleNextQuestion}
                            className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors bg-[#324B55] hover:bg-[#253941] flex items-center gap-1.5"
                          >
                            <span>
                              {currentQuestionIndex + 1 === questions.length ? 'Complete Quiz' : 'Next Question'}
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </article>
                  </div>
                )
              )}
            </div>
          ) : (
            /* FLASHCARDS MODE VIEW */
            <div className="flex flex-col gap-6 max-w-xl mx-auto w-full items-center">
              {flashcards.length === 0 ? (
                <div
                  className="w-full p-8 rounded-xl border text-center flex flex-col items-center gap-3 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Layers className="w-6 h-6 text-gray-400" />
                  <p style={{ color: 'var(--text-muted)' }}>No flashcards were generated for this note.</p>
                  <button
                    onClick={() => loadStudyMaterials(true)}
                    className="px-4 py-2 rounded-lg font-semibold text-white bg-[#4A5C43] hover:bg-[#3d4d37] transition-colors"
                  >
                    Generate Flashcards
                  </button>
                </div>
              ) : (
                currentCard && (
                  <>
                    <div className="flex items-center justify-between w-full text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>
                        Card {cardIndex + 1} of {flashcards.length}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono text-[11px] font-semibold">
                        {currentCard.source_ref || 'Note Content'}
                      </span>
                    </div>

                    {/* Interactive Flip Card */}
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="w-full h-72 sm:h-80 rounded-2xl border p-8 flex flex-col justify-between items-center text-center cursor-pointer shadow-xs hover:shadow-md transition-all select-none"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-strong)',
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          setIsCardFlipped(!isCardFlipped);
                        }
                      }}
                    >
                      <span
                        className="text-[11px] uppercase tracking-wider font-semibold"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {isCardFlipped ? 'Definition (Click to see term)' : 'Term (Click to reveal definition)'}
                      </span>

                      <div className="my-auto px-4">
                        {isCardFlipped ? (
                          <p className="text-base sm:text-lg leading-relaxed font-sans" style={{ color: 'var(--text-main)' }}>
                            {currentCard.definition}
                          </p>
                        ) : (
                          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {currentCard.term}
                          </h2>
                        )}
                      </div>

                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        Source: {currentCard.source_ref || 'Extracted Note Content'}
                      </span>
                    </div>

                    {/* Flashcard Navigation Controls */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handlePrevCard}
                        className="p-2.5 rounded-full border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderColor: 'var(--border-strong)' }}
                        title="Previous card"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-strong)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {isCardFlipped ? 'Show Term' : 'Flip to Reveal'}
                      </button>

                      <button
                        onClick={handleNextCard}
                        className="p-2.5 rounded-full border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        style={{ borderColor: 'var(--border-strong)' }}
                        title="Next card"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
