import { User, InsertUser, File, FailedAttempt, users, files, failedAttempts } from "@shared/schema";
import { db } from "./db";
import { eq, and, lt, gt } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // File operations
  createFile(file: Omit<File, "id" | "createdAt">): Promise<File>;
  getFileById(id: number): Promise<File | undefined>;
  getFileByConnectionCode(code: string): Promise<File | undefined>;
  getActiveFileCount(): Promise<number>;
  updateFileDownloadUrl(id: number, url: string, expiresAt: Date): Promise<void>;
  updateFileStatus(id: number, status: string): Promise<void>;
  
  // Failed attempts operations
  getFailedAttempt(ip: string): Promise<FailedAttempt | undefined>;
  createFailedAttempt(data: Omit<FailedAttempt, "id">): Promise<FailedAttempt>;
  updateFailedAttempts(ip: string, attempts: number, lastAttemptAt: Date): Promise<FailedAttempt>;
  setFailedAttemptTimeout(ip: string, timeoutUntil: Date, timeoutDuration: number): Promise<void>;
  resetFailedAttempts(ip: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result.length > 0 ? result[0] : undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // File operations
  async createFile(file: Omit<File, "id" | "createdAt">): Promise<File> {
    const result = await db.insert(files).values(file).returning();
    return result[0];
  }

  async getFileById(id: number): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id));
    return result.length > 0 ? result[0] : undefined;
  }

  async getFileByConnectionCode(code: string): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.connectionCode, code));
    return result.length > 0 ? result[0] : undefined;
  }

  async getActiveFileCount(): Promise<number> {
    const now = new Date();
    const result = await db
      .select({ count: { _count: files.id } })
      .from(files)
      .where(
        and(
          eq(files.status, "WAITING_FOR_DOWNLOAD"),
          gt(files.expiresAt, now)
        )
      );
    
    return result.length > 0 ? Number(result[0].count._count) : 0;
  }

  async updateFileDownloadUrl(id: number, url: string, expiresAt: Date): Promise<void> {
    await db
      .update(files)
      .set({
        downloadUrl: url,
        downloadExpiresAt: expiresAt
      })
      .where(eq(files.id, id));
  }

  async updateFileStatus(id: number, status: string): Promise<void> {
    await db
      .update(files)
      .set({ status })
      .where(eq(files.id, id));
  }

  // Failed attempts operations
  async getFailedAttempt(ip: string): Promise<FailedAttempt | undefined> {
    const result = await db.select().from(failedAttempts).where(eq(failedAttempts.ip, ip));
    return result.length > 0 ? result[0] : undefined;
  }

  async createFailedAttempt(data: Omit<FailedAttempt, "id">): Promise<FailedAttempt> {
    const result = await db.insert(failedAttempts).values(data).returning();
    return result[0];
  }

  async updateFailedAttempts(ip: string, attempts: number, lastAttemptAt: Date): Promise<FailedAttempt> {
    const existingAttempt = await this.getFailedAttempt(ip);
    
    if (!existingAttempt) {
      return this.createFailedAttempt({
        ip,
        attempts,
        lastAttemptAt,
        timeoutDuration: 0
      });
    }
    
    await db
      .update(failedAttempts)
      .set({
        attempts,
        lastAttemptAt
      })
      .where(eq(failedAttempts.ip, ip));
    
    const updated = await this.getFailedAttempt(ip);
    return updated!;
  }

  async setFailedAttemptTimeout(ip: string, timeoutUntil: Date, timeoutDuration: number): Promise<void> {
    await db
      .update(failedAttempts)
      .set({
        timeoutUntil,
        timeoutDuration
      })
      .where(eq(failedAttempts.ip, ip));
  }

  async resetFailedAttempts(ip: string): Promise<void> {
    await db
      .update(failedAttempts)
      .set({
        attempts: 0,
        timeoutUntil: null,
        timeoutDuration: 0
      })
      .where(eq(failedAttempts.ip, ip));
  }
}

export const storage = new DatabaseStorage();
