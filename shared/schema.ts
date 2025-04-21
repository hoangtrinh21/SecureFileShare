import { pgTable, text, serial, integer, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  picture: text("picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
});

// File table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type").notNull(),
  data: text("data").notNull(), // Base64 encoded file data
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  connectionCode: text("connection_code").unique(),
  status: text("status").notNull().default("WAITING_FOR_DOWNLOAD"),
  expiresAt: timestamp("expires_at"), // When the connection code expires
  downloadUrl: text("download_url"),
  downloadExpiresAt: timestamp("download_expires_at"), // When the download link expires
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  connectionCode: true,
  status: true,
  expiresAt: true,
  downloadUrl: true,
  downloadExpiresAt: true,
});

// Failed Attempts table - for tracking incorrect code entries
export const failedAttempts = pgTable("failed_attempts", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at").defaultNow().notNull(),
  timeoutUntil: timestamp("timeout_until"),
  timeoutDuration: integer("timeout_duration").default(0), // In seconds
});

export const insertFailedAttemptSchema = createInsertSchema(failedAttempts).omit({
  id: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type FailedAttempt = typeof failedAttempts.$inferSelect;
export type InsertFailedAttempt = z.infer<typeof insertFailedAttemptSchema>;
