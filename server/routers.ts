import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createLearningSession, getLearningSessionBySessionId, getChatLogsBySessionId, createChatLog } from "./db";
import { v4 as uuidv4 } from "uuid";

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

  /**
   * Learning Router
   * Handles session management and chat interactions for the economics learning platform
   */
  learning: router({
    /**
     * Start a new learning session
     * Input: topic (required), optional description
     * Output: sessionId, topic, createdAt
     */
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

    /**
     * Get an existing learning session and its chat history
     * Input: sessionId
     * Output: session details and chat logs
     */
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

    /**
     * Send a message and get AI response
     * Input: sessionId, message
     * Output: assistant response with metadata
     */
    chat: publicProcedure
      .input(
        z.object({
          sessionId: z.string(),
          message: z.string().min(1, "Message is required"),
        })
      )
      .mutation(async ({ input }) => {
        // Verify session exists
        const session = await getLearningSessionBySessionId(input.sessionId);
        if (!session) {
          throw new Error("Session not found");
        }

        // Save user message
        await createChatLog({
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
          contentType: "text",
        });

        // TODO: Integrate with LLM API to generate AI response
        // For now, return a placeholder response
        const assistantResponse = `I received your question about ${session.topic}: "${input.message}". 
        The AI response generation will be implemented in the next phase with LLM integration.`;

        // Save assistant response
        const chatLog = await createChatLog({
          sessionId: input.sessionId,
          role: "assistant",
          content: assistantResponse,
          contentType: "text",
        });

        return {
          id: chatLog?.id,
          role: "assistant",
          content: assistantResponse,
          contentType: "text",
          metadata: null,
          createdAt: chatLog?.createdAt,
        };
      }),

    /**
     * Get chat history for a session
     * Input: sessionId
     * Output: array of chat logs
     */
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
  }),
});

export type AppRouter = typeof appRouter;
