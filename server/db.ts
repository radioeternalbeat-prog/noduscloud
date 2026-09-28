import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { contentItems, InsertContentItem, InsertPublicationProfile, InsertShareLink, InsertUser, publicationProfiles, shareLinks, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  textFields.forEach(field => {
    if (user[field] !== undefined) {
      const value = user[field] ?? null;
      values[field] = value;
      updateSet[field] = value;
    }
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listContentItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentItems).where(eq(contentItems.userId, userId)).orderBy(desc(contentItems.updatedAt));
}

export async function createContentItem(item: InsertContentItem) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(contentItems).values(item);
  const id = Number(result[0].insertId);
  const rows = await db.select().from(contentItems).where(eq(contentItems.id, id)).limit(1);
  return rows[0];
}

export async function updateContentItem(id: number, userId: number, values: Partial<InsertContentItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(contentItems).set(values).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
  const rows = await db.select().from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId))).limit(1);
  return rows[0];
}

export async function deleteContentItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
  return { success: true } as const;
}

export async function createShareLink(link: InsertShareLink) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(shareLinks).values(link);
  const id = Number(result[0].insertId);
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
  return rows[0];
}

export async function getShareLinkByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  return rows[0];
}

export async function listShareLinks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shareLinks).where(eq(shareLinks.userId, userId)).orderBy(desc(shareLinks.createdAt));
}

export async function deactivateShareLink(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(shareLinks).set({ isActive: false }).where(and(eq(shareLinks.id, id), eq(shareLinks.userId, userId)));
  return { success: true } as const;
}

export async function getSharedContent(link: NonNullable<Awaited<ReturnType<typeof getShareLinkByToken>>>) {
  const db = await getDb();
  if (!db) return [];
  if (link.kind === "content" && link.contentId) {
    return db.select().from(contentItems).where(and(eq(contentItems.id, link.contentId), eq(contentItems.userId, link.userId))).limit(1);
  }
  if (link.kind === "collection" && link.collectionName) {
    return db.select().from(contentItems).where(and(eq(contentItems.userId, link.userId), eq(contentItems.category, link.collectionName))).orderBy(desc(contentItems.updatedAt));
  }
  return [];
}


export async function listPublicationProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicationProfiles).where(eq(publicationProfiles.userId, userId)).orderBy(desc(publicationProfiles.createdAt));
}

export async function createPublicationProfile(profile: InsertPublicationProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(publicationProfiles).values(profile);
  const rows = await db.select().from(publicationProfiles).where(eq(publicationProfiles.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updatePublicationProfile(id: number, userId: number, values: Partial<InsertPublicationProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(publicationProfiles).set(values).where(and(eq(publicationProfiles.id, id), eq(publicationProfiles.userId, userId)));
  const rows = await db.select().from(publicationProfiles).where(and(eq(publicationProfiles.id, id), eq(publicationProfiles.userId, userId))).limit(1);
  return rows[0];
}

export async function deletePublicationProfile(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(publicationProfiles).where(and(eq(publicationProfiles.id, id), eq(publicationProfiles.userId, userId)));
  return { success: true } as const;
}


export async function getContentItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId))).limit(1);
  return rows[0];
}


export async function recordContentOpen(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(contentItems)
    .set({ openCount: sql`${contentItems.openCount} + 1` })
    .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));
  const rows = await db.select().from(contentItems).where(and(eq(contentItems.id, id), eq(contentItems.userId, userId))).limit(1);
  return rows[0];
}
