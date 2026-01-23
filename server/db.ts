import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, learningSessions, InsertLearningSession, LearningSession, chatLogs, InsertChatLog, ChatLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Learning Session Queries
 */

export async function createLearningSession(session: InsertLearningSession): Promise<LearningSession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create learning session: database not available");
    return null;
  }

  try {
    const result = await db.insert(learningSessions).values(session);
    // Fetch the created record
    const created = await db.select().from(learningSessions).where(eq(learningSessions.sessionId, session.sessionId)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create learning session:", error);
    throw error;
  }
}

export async function getLearningSessionBySessionId(sessionId: string): Promise<LearningSession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get learning session: database not available");
    return null;
  }

  try {
    const result = await db.select().from(learningSessions).where(eq(learningSessions.sessionId, sessionId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get learning session:", error);
    throw error;
  }
}

export async function updateLearningSession(sessionId: string, updates: Partial<Omit<LearningSession, 'id' | 'createdAt'>>): Promise<LearningSession | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update learning session: database not available");
    return null;
  }

  try {
    await db.update(learningSessions).set(updates).where(eq(learningSessions.sessionId, sessionId));
    return getLearningSessionBySessionId(sessionId);
  } catch (error) {
    console.error("[Database] Failed to update learning session:", error);
    throw error;
  }
}

/**
 * Chat Log Queries
 */

export async function createChatLog(log: InsertChatLog): Promise<ChatLog | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create chat log: database not available");
    return null;
  }

  try {
    const result = await db.insert(chatLogs).values(log);
    // Fetch the created record by ID
    const created = await db.select().from(chatLogs).orderBy(chatLogs.id).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create chat log:", error);
    throw error;
  }
}

export async function getChatLogsBySessionId(sessionId: string): Promise<ChatLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get chat logs: database not available");
    return [];
  }

  try {
    const result = await db.select().from(chatLogs).where(eq(chatLogs.sessionId, sessionId)).orderBy(chatLogs.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get chat logs:", error);
    throw error;
  }
}

export async function getChatLogById(id: number): Promise<ChatLog | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get chat log: database not available");
    return null;
  }

  try {
    const result = await db.select().from(chatLogs).where(eq(chatLogs.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get chat log:", error);
    throw error;
  }
}

export async function deleteChatLogsBySessionId(sessionId: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete chat logs: database not available");
    return;
  }

  try {
    await db.delete(chatLogs).where(eq(chatLogs.sessionId, sessionId));
  } catch (error) {
    console.error("[Database] Failed to delete chat logs:", error);
    throw error;
  }
}


// Import additional schema tables
import { quizzes, InsertQuiz, Quiz, practiceProblems, InsertPracticeProblem, PracticeProblem, learningNotes, InsertLearningNote, LearningNote, sessionPerformance, InsertSessionPerformance, SessionPerformance } from "../drizzle/schema";
import { desc, and, sql } from "drizzle-orm";

/**
 * Quiz Queries
 */

export async function createQuiz(quiz: InsertQuiz): Promise<Quiz | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create quiz: database not available");
    return null;
  }

  try {
    await db.insert(quizzes).values(quiz);
    const created = await db.select().from(quizzes).orderBy(desc(quizzes.id)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create quiz:", error);
    throw error;
  }
}

export async function createQuizzes(quizzesToInsert: InsertQuiz[]): Promise<Quiz[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create quizzes: database not available");
    return [];
  }

  try {
    if (quizzesToInsert.length === 0) return [];
    
    await db.insert(quizzes).values(quizzesToInsert);
    // Fetch the recently created quizzes
    const sessionId = quizzesToInsert[0].sessionId;
    const created = await db.select().from(quizzes)
      .where(eq(quizzes.sessionId, sessionId))
      .orderBy(desc(quizzes.id))
      .limit(quizzesToInsert.length);
    return created.reverse();
  } catch (error) {
    console.error("[Database] Failed to create quizzes:", error);
    throw error;
  }
}

export async function getQuizzesBySessionId(sessionId: string): Promise<Quiz[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get quizzes: database not available");
    return [];
  }

  try {
    const result = await db.select().from(quizzes)
      .where(eq(quizzes.sessionId, sessionId))
      .orderBy(quizzes.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get quizzes:", error);
    throw error;
  }
}

export async function updateQuizAnswer(quizId: number, userAnswer: string, isCorrect: boolean): Promise<Quiz | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update quiz answer: database not available");
    return null;
  }

  try {
    await db.update(quizzes)
      .set({ userAnswer, isCorrect: isCorrect ? 1 : 0 })
      .where(eq(quizzes.id, quizId));
    
    const updated = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    return updated.length > 0 ? updated[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update quiz answer:", error);
    throw error;
  }
}

export async function getQuizById(quizId: number): Promise<Quiz | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get quiz: database not available");
    return null;
  }

  try {
    const result = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get quiz:", error);
    throw error;
  }
}

/**
 * Practice Problem Queries
 */

export async function createPracticeProblem(problem: InsertPracticeProblem): Promise<PracticeProblem | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create practice problem: database not available");
    return null;
  }

  try {
    await db.insert(practiceProblems).values(problem);
    const created = await db.select().from(practiceProblems).orderBy(desc(practiceProblems.id)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create practice problem:", error);
    throw error;
  }
}

export async function createPracticeProblems(problemsToInsert: InsertPracticeProblem[]): Promise<PracticeProblem[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create practice problems: database not available");
    return [];
  }

  try {
    if (problemsToInsert.length === 0) return [];
    
    await db.insert(practiceProblems).values(problemsToInsert);
    const sessionId = problemsToInsert[0].sessionId;
    const created = await db.select().from(practiceProblems)
      .where(eq(practiceProblems.sessionId, sessionId))
      .orderBy(desc(practiceProblems.id))
      .limit(problemsToInsert.length);
    return created.reverse();
  } catch (error) {
    console.error("[Database] Failed to create practice problems:", error);
    throw error;
  }
}

export async function getPracticeProblemsBySessionId(sessionId: string): Promise<PracticeProblem[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get practice problems: database not available");
    return [];
  }

  try {
    const result = await db.select().from(practiceProblems)
      .where(eq(practiceProblems.sessionId, sessionId))
      .orderBy(practiceProblems.createdAt);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get practice problems:", error);
    throw error;
  }
}

export async function markProblemCompleted(problemId: number): Promise<PracticeProblem | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark problem completed: database not available");
    return null;
  }

  try {
    await db.update(practiceProblems)
      .set({ isCompleted: 1 })
      .where(eq(practiceProblems.id, problemId));
    
    const updated = await db.select().from(practiceProblems).where(eq(practiceProblems.id, problemId)).limit(1);
    return updated.length > 0 ? updated[0] : null;
  } catch (error) {
    console.error("[Database] Failed to mark problem completed:", error);
    throw error;
  }
}

/**
 * Learning Notes Queries
 */

export async function createLearningNote(note: InsertLearningNote): Promise<LearningNote | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create learning note: database not available");
    return null;
  }

  try {
    await db.insert(learningNotes).values(note);
    const created = await db.select().from(learningNotes).orderBy(desc(learningNotes.id)).limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create learning note:", error);
    throw error;
  }
}

export async function getLearningNotesBySessionId(sessionId: string): Promise<LearningNote[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get learning notes: database not available");
    return [];
  }

  try {
    const result = await db.select().from(learningNotes)
      .where(eq(learningNotes.sessionId, sessionId))
      .orderBy(desc(learningNotes.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get learning notes:", error);
    throw error;
  }
}

export async function updateLearningNote(noteId: number, updates: Partial<Pick<LearningNote, 'noteText' | 'category'>>): Promise<LearningNote | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update learning note: database not available");
    return null;
  }

  try {
    await db.update(learningNotes).set(updates).where(eq(learningNotes.id, noteId));
    const updated = await db.select().from(learningNotes).where(eq(learningNotes.id, noteId)).limit(1);
    return updated.length > 0 ? updated[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update learning note:", error);
    throw error;
  }
}

export async function deleteLearningNote(noteId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete learning note: database not available");
    return;
  }

  try {
    await db.delete(learningNotes).where(eq(learningNotes.id, noteId));
  } catch (error) {
    console.error("[Database] Failed to delete learning note:", error);
    throw error;
  }
}

/**
 * Session Performance Queries
 */

export async function getOrCreateSessionPerformance(sessionId: string): Promise<SessionPerformance | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get/create session performance: database not available");
    return null;
  }

  try {
    // Try to get existing performance record
    const existing = await db.select().from(sessionPerformance)
      .where(eq(sessionPerformance.sessionId, sessionId))
      .limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    // Create new performance record
    await db.insert(sessionPerformance).values({
      sessionId,
      totalProblems: 0,
      correctAnswers: 0,
      currentDifficulty: "medium",
    });

    const created = await db.select().from(sessionPerformance)
      .where(eq(sessionPerformance.sessionId, sessionId))
      .limit(1);
    return created.length > 0 ? created[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get/create session performance:", error);
    throw error;
  }
}

export async function updateSessionPerformance(
  sessionId: string,
  isCorrect: boolean,
  newDifficulty?: "easy" | "medium" | "hard"
): Promise<SessionPerformance | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update session performance: database not available");
    return null;
  }

  try {
    // Get current performance
    const current = await getOrCreateSessionPerformance(sessionId);
    if (!current) return null;

    const updates: Partial<SessionPerformance> = {
      totalProblems: current.totalProblems + 1,
      correctAnswers: isCorrect ? current.correctAnswers + 1 : current.correctAnswers,
      lastActivityAt: new Date(),
    };

    if (newDifficulty) {
      updates.currentDifficulty = newDifficulty;
    }

    await db.update(sessionPerformance)
      .set(updates)
      .where(eq(sessionPerformance.sessionId, sessionId));

    return getOrCreateSessionPerformance(sessionId);
  } catch (error) {
    console.error("[Database] Failed to update session performance:", error);
    throw error;
  }
}

/**
 * Calculate recommended difficulty based on accuracy rate
 */
export function calculateRecommendedDifficulty(
  totalProblems: number,
  correctAnswers: number,
  currentDifficulty: "easy" | "medium" | "hard"
): "easy" | "medium" | "hard" {
  // Need at least 5 problems to adjust difficulty
  if (totalProblems < 5) {
    return currentDifficulty;
  }

  const accuracyRate = correctAnswers / totalProblems;

  // High accuracy (>80%) - increase difficulty
  if (accuracyRate > 0.8) {
    if (currentDifficulty === "easy") return "medium";
    if (currentDifficulty === "medium") return "hard";
    return "hard";
  }

  // Low accuracy (<50%) - decrease difficulty
  if (accuracyRate < 0.5) {
    if (currentDifficulty === "hard") return "medium";
    if (currentDifficulty === "medium") return "easy";
    return "easy";
  }

  // Moderate accuracy (50-80%) - maintain current difficulty
  return currentDifficulty;
}
