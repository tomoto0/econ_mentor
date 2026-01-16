import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createLearningSession, getLearningSessionBySessionId, getChatLogsBySessionId, createChatLog } from "./db";
import { v4 as uuidv4 } from "uuid";
import { generateMentorResponse } from "./llmService";
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

    // Quiz endpoints
    getQuizzes: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return [];
      }),

    generateQuiz: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          topic: z.string(),
          count: z.number().default(3),
        })
      )
      .mutation(async ({ input }) => {
        return { quizzes: [] };
      }),

    submitQuizAnswer: publicProcedure
      .input(
        z.object({
          quizId: z.number(),
          userAnswer: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return { success: true };
      }),

    // Practice problem endpoints
    getPracticeProblems: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return [];
      }),

    generatePracticeProblems: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          topic: z.string(),
          difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
          count: z.number().default(3),
        })
      )
      .mutation(async ({ input }) => {
        return { problems: [] };
      }),

    // Note endpoints
    getNotes: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return [];
      }),

    createNote: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          noteText: z.string(),
          category: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return { success: true };
      }),

    // Performance endpoints
    getSessionPerformance: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return {
          totalProblems: 0,
          correctAnswers: 0,
          accuracyRate: 0,
          currentDifficulty: "medium",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
