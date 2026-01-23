import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createLearningSession, 
  getLearningSessionBySessionId, 
  getChatLogsBySessionId, 
  createChatLog,
  createQuizzes,
  getQuizzesBySessionId,
  updateQuizAnswer,
  getQuizById,
  createPracticeProblems,
  getPracticeProblemsBySessionId,
  markProblemCompleted,
  createLearningNote,
  getLearningNotesBySessionId,
  updateLearningNote,
  deleteLearningNote,
  getOrCreateSessionPerformance,
  updateSessionPerformance,
  calculateRecommendedDifficulty,
} from "./db";
import { v4 as uuidv4 } from "uuid";
import { generateMentorResponse, generateQuizQuestions, generatePracticeProblemsLLM } from "./llmService";
import { searchEconomicNews, generateEconomicScenario } from "./newsService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  learning: router({
    startSession: publicProcedure
      .input(
        z.object({
          topic: z.string().min(1, "Topic is required"),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const sessionId = uuidv4();
        const session = await createLearningSession({
          sessionId,
          topic: input.topic,
          description: input.description,
        });

        if (!session) {
          throw new Error("Failed to create learning session");
        }

        // Initialize session performance
        await getOrCreateSessionPerformance(sessionId);

        return {
          sessionId: session.sessionId,
          topic: session.topic,
          createdAt: session.createdAt,
        };
      }),

    getSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const session = await getLearningSessionBySessionId(input.sessionId);
        if (!session) {
          return null;
        }

        const chatLogs = await getChatLogsBySessionId(input.sessionId);

        return {
          session: {
            sessionId: session.sessionId,
            topic: session.topic,
            description: session.description,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          },
          chatLogs: chatLogs.map(log => ({
            id: log.id,
            role: log.role,
            content: log.content,
            contentType: log.contentType,
            metadata: log.metadata ? JSON.parse(log.metadata) : null,
            createdAt: log.createdAt,
          })),
        };
      }),

    chat: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          message: z.string().min(1, "Message is required"),
        })
      )
      .mutation(async ({ input }) => {
        const session = await getLearningSessionBySessionId(input.sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        await createChatLog({
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
          contentType: "text",
        });

        const llmResponse = await generateMentorResponse(
          session.topic,
          input.message,
          input.sessionId
        );

        const chatLog = await createChatLog({
          sessionId: input.sessionId,
          role: "assistant",
          content: llmResponse.content,
          contentType: llmResponse.contentType,
          metadata: llmResponse.metadata ? JSON.stringify(llmResponse.metadata) : undefined,
        });

        return {
          id: chatLog?.id,
          role: "assistant",
          content: llmResponse.content,
          contentType: llmResponse.contentType,
          metadata: llmResponse.metadata,
          createdAt: chatLog?.createdAt,
        };
      }),

    getChatHistory: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const chatLogs = await getChatLogsBySessionId(input.sessionId);
        return chatLogs.map(log => ({
          id: log.id,
          role: log.role,
          content: log.content,
          contentType: log.contentType,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
          createdAt: log.createdAt,
        }));
      }),

    searchNews: publicProcedure
      .input(z.object({ topic: z.string() }))
      .query(async ({ input }) => {
        return await searchEconomicNews(input.topic);
      }),

    analyzeScenario: publicProcedure
      .input(
        z.object({
          topic: z.string(),
          scenario: z.string(),
        })
      )
      .query(async ({ input }) => {
        const analysis = await generateEconomicScenario(input.topic, input.scenario);
        return {
          scenario: input.scenario,
          analysis,
          contentType: "scenario",
        };
      }),

    // Quiz endpoints with LLM integration
    getQuizzes: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const quizzes = await getQuizzesBySessionId(input.sessionId);
        return quizzes.map(quiz => ({
          id: quiz.id,
          question: quiz.question,
          options: JSON.parse(quiz.options),
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation,
          userAnswer: quiz.userAnswer,
          isCorrect: quiz.isCorrect === 1,
          difficulty: quiz.difficulty,
          createdAt: quiz.createdAt,
        }));
      }),

    generateQuiz: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          topic: z.string(),
          count: z.number().default(3),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Get recommended difficulty if not specified
        let difficulty = input.difficulty;
        if (!difficulty) {
          const performance = await getOrCreateSessionPerformance(input.sessionId);
          difficulty = performance?.currentDifficulty || "medium";
        }

        // Generate quiz questions using LLM
        const generatedQuizzes = await generateQuizQuestions(
          input.topic,
          input.count,
          difficulty
        );

        if (generatedQuizzes.length === 0) {
          throw new Error("Failed to generate quiz questions");
        }

        // Save to database
        const quizzesToInsert = generatedQuizzes.map(quiz => ({
          sessionId: input.sessionId,
          question: quiz.question,
          options: JSON.stringify(quiz.options),
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation || "",
          difficulty: quiz.difficulty as "easy" | "medium" | "hard",
        }));

        const savedQuizzes = await createQuizzes(quizzesToInsert);

        return {
          quizzes: savedQuizzes.map(quiz => ({
            id: quiz.id,
            question: quiz.question,
            options: JSON.parse(quiz.options),
            correctAnswer: quiz.correctAnswer,
            explanation: quiz.explanation,
            difficulty: quiz.difficulty,
            createdAt: quiz.createdAt,
          })),
        };
      }),

    submitQuizAnswer: publicProcedure
      .input(
        z.object({
          quizId: z.number(),
          userAnswer: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const quiz = await getQuizById(input.quizId);
        if (!quiz) {
          throw new Error("Quiz not found");
        }

        const isCorrect = input.userAnswer.toUpperCase() === quiz.correctAnswer.toUpperCase();
        
        // Update quiz with user's answer
        await updateQuizAnswer(input.quizId, input.userAnswer, isCorrect);

        // Update session performance and get recommended difficulty
        const performance = await updateSessionPerformance(
          quiz.sessionId,
          isCorrect
        );

        let recommendedDifficulty: "easy" | "medium" | "hard" = "medium";
        if (performance) {
          recommendedDifficulty = calculateRecommendedDifficulty(
            performance.totalProblems,
            performance.correctAnswers,
            performance.currentDifficulty as "easy" | "medium" | "hard"
          );

          // Update difficulty if changed
          if (recommendedDifficulty !== performance.currentDifficulty) {
            await updateSessionPerformance(quiz.sessionId, isCorrect, recommendedDifficulty);
          }
        }

        return {
          success: true,
          isCorrect,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation,
          recommendedDifficulty,
        };
      }),

    // Practice problem endpoints with LLM integration
    getPracticeProblems: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const problems = await getPracticeProblemsBySessionId(input.sessionId);
        return problems.map(problem => ({
          id: problem.id,
          problem: problem.problem,
          solution: JSON.parse(problem.solution),
          answer: problem.answer,
          hints: problem.hints ? JSON.parse(problem.hints) : [],
          difficulty: problem.difficulty,
          isCompleted: problem.isCompleted === 1,
          createdAt: problem.createdAt,
        }));
      }),

    generatePracticeProblems: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          topic: z.string(),
          difficulty: z.enum(["easy", "medium", "hard"]).optional(),
          count: z.number().default(3),
        })
      )
      .mutation(async ({ input }) => {
        // Get recommended difficulty if not specified
        let difficulty = input.difficulty;
        if (!difficulty) {
          const performance = await getOrCreateSessionPerformance(input.sessionId);
          difficulty = performance?.currentDifficulty || "medium";
        }

        // Generate practice problems using LLM
        const generatedProblems = await generatePracticeProblemsLLM(
          input.topic,
          input.count,
          difficulty
        );

        if (generatedProblems.length === 0) {
          throw new Error("Failed to generate practice problems");
        }

        // Save to database
        const problemsToInsert = generatedProblems.map(problem => ({
          sessionId: input.sessionId,
          problem: problem.problem,
          solution: JSON.stringify(problem.solution),
          answer: problem.answer,
          hints: JSON.stringify(problem.hints),
          difficulty: problem.difficulty as "easy" | "medium" | "hard",
        }));

        const savedProblems = await createPracticeProblems(problemsToInsert);

        return {
          problems: savedProblems.map(problem => ({
            id: problem.id,
            problem: problem.problem,
            solution: JSON.parse(problem.solution),
            answer: problem.answer,
            hints: problem.hints ? JSON.parse(problem.hints) : [],
            difficulty: problem.difficulty,
            createdAt: problem.createdAt,
          })),
        };
      }),

    markProblemComplete: publicProcedure
      .input(z.object({ problemId: z.number() }))
      .mutation(async ({ input }) => {
        const problem = await markProblemCompleted(input.problemId);
        return { success: !!problem };
      }),

    // Note endpoints with database integration
    getNotes: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const notes = await getLearningNotesBySessionId(input.sessionId);
        return notes.map(note => ({
          id: note.id,
          noteText: note.noteText,
          category: note.category,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
        }));
      }),

    createNote: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          noteText: z.string().min(1, "Note text is required"),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const note = await createLearningNote({
          sessionId: input.sessionId,
          noteText: input.noteText,
          category: input.category,
        });

        if (!note) {
          throw new Error("Failed to create note");
        }

        return {
          id: note.id,
          noteText: note.noteText,
          category: note.category,
          createdAt: note.createdAt,
        };
      }),

    updateNote: publicProcedure
      .input(
        z.object({
          noteId: z.number(),
          noteText: z.string().optional(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updates: { noteText?: string; category?: string } = {};
        if (input.noteText !== undefined) updates.noteText = input.noteText;
        if (input.category !== undefined) updates.category = input.category;

        const note = await updateLearningNote(input.noteId, updates);
        return { success: !!note };
      }),

    deleteNote: publicProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLearningNote(input.noteId);
        return { success: true };
      }),

    // Performance endpoints with adaptive difficulty
    getSessionPerformance: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const performance = await getOrCreateSessionPerformance(input.sessionId);
        
        if (!performance) {
          return {
            totalProblems: 0,
            correctAnswers: 0,
            accuracyRate: 0,
            currentDifficulty: "medium" as const,
            recommendedDifficulty: "medium" as const,
          };
        }

        const accuracyRate = performance.totalProblems > 0
          ? Math.round((performance.correctAnswers / performance.totalProblems) * 100)
          : 0;

        const recommendedDifficulty = calculateRecommendedDifficulty(
          performance.totalProblems,
          performance.correctAnswers,
          performance.currentDifficulty as "easy" | "medium" | "hard"
        );

        return {
          totalProblems: performance.totalProblems,
          correctAnswers: performance.correctAnswers,
          accuracyRate,
          currentDifficulty: performance.currentDifficulty,
          recommendedDifficulty,
          lastActivityAt: performance.lastActivityAt,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
