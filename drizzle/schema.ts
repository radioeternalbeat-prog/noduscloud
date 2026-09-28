import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["image", "video", "note", "link", "publication"]).notNull().default("note"),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  body: text("body"),
  url: text("url"),
  fileUrl: text("fileUrl"),
  category: varchar("category", { length: 80 }).default("Sin organizar"),
  tags: text("tags"),
  status: mysqlEnum("status", ["idea", "draft", "ready", "published"]).notNull().default("idea"),
  platform: varchar("platform", { length: 80 }),
  profileId: int("profileId"),
  isFavorite: boolean("isFavorite").notNull().default(false),
  openCount: int("openCount").notNull().default(0),
  scheduledAt: timestamp("scheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const publicationProfiles = mysqlTable("publication_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  contentType: mysqlEnum("contentType", ["image", "video", "publication", "all"]).notNull().default("all"),
  platform: varchar("platform", { length: 80 }).notNull().default("Instagram"),
  tone: varchar("tone", { length: 80 }).default("Cercano y claro"),
  captionTemplate: text("captionTemplate"),
  hashtags: text("hashtags"),
  videoQuality: mysqlEnum("videoQuality", ["original", "1080p", "720p", "480p"]).notNull().default("1080p"),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const shareLinks = mysqlTable("share_links", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 96 }).notNull().unique(),
  kind: mysqlEnum("kind", ["content", "collection"]).notNull(),
  contentId: int("contentId"),
  collectionName: varchar("collectionName", { length: 120 }),
  title: varchar("title", { length: 180 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;
export type PublicationProfile = typeof publicationProfiles.$inferSelect;
export type InsertPublicationProfile = typeof publicationProfiles.$inferInsert;
export type ShareLink = typeof shareLinks.$inferSelect;
export type InsertShareLink = typeof shareLinks.$inferInsert;
