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
