import { User, InsertUser, File, FailedAttempt } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private files: Map<number, File>;
  private failedAttempts: Map<string, FailedAttempt>;
  private nextFileId: number;
  private nextFailedAttemptId: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.failedAttempts = new Map();
    this.nextFileId = 1;
    this.nextFailedAttemptId = 1;
  }

  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      createdAt: new Date(),
    };
    this.users.set(user.id, newUser);
    return newUser;
  }

  // File operations
  async createFile(file: Omit<File, "id" | "createdAt">): Promise<File> {
    const id = this.nextFileId++;
    const newFile: File = {
      ...file,
      id,
      createdAt: new Date(),
    };
    this.files.set(id, newFile);
    return newFile;
  }

  async getFileById(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFileByConnectionCode(code: string): Promise<File | undefined> {
    return Array.from(this.files.values()).find(
      (file) => file.connectionCode === code,
    );
  }

  async getActiveFileCount(): Promise<number> {
    return Array.from(this.files.values()).filter(
      (file) => 
        file.status === "WAITING_FOR_DOWNLOAD" && 
        (!file.expiresAt || new Date() < new Date(file.expiresAt))
    ).length;
  }

  async updateFileDownloadUrl(id: number, url: string, expiresAt: Date): Promise<void> {
    const file = this.files.get(id);
    if (file) {
      file.downloadUrl = url;
      file.downloadExpiresAt = expiresAt;
      this.files.set(id, file);
    }
  }

  async updateFileStatus(id: number, status: string): Promise<void> {
    const file = this.files.get(id);
    if (file) {
      file.status = status;
      this.files.set(id, file);
    }
  }

  // Failed attempts operations
  async getFailedAttempt(ip: string): Promise<FailedAttempt | undefined> {
    return this.failedAttempts.get(ip);
  }

  async createFailedAttempt(data: Omit<FailedAttempt, "id">): Promise<FailedAttempt> {
    const id = this.nextFailedAttemptId++;
    const record: FailedAttempt = { ...data, id };
    this.failedAttempts.set(data.ip, record);
    return record;
  }

  async updateFailedAttempts(ip: string, attempts: number, lastAttemptAt: Date): Promise<FailedAttempt> {
    let record = this.failedAttempts.get(ip);
    
    if (!record) {
      return this.createFailedAttempt({ 
        ip, 
        attempts, 
        lastAttemptAt,
        timeoutDuration: 0,
      });
    }
    
    record = {
      ...record,
      attempts,
      lastAttemptAt,
    };
    
    this.failedAttempts.set(ip, record);
    return record;
  }

  async setFailedAttemptTimeout(ip: string, timeoutUntil: Date, timeoutDuration: number): Promise<void> {
    const record = this.failedAttempts.get(ip);
    
    if (record) {
      record.timeoutUntil = timeoutUntil;
      record.timeoutDuration = timeoutDuration;
      this.failedAttempts.set(ip, record);
    }
  }

  async resetFailedAttempts(ip: string): Promise<void> {
    const record = this.failedAttempts.get(ip);
    
    if (record) {
      record.attempts = 0;
      record.timeoutUntil = undefined;
      record.timeoutDuration = 0;
      this.failedAttempts.set(ip, record);
    }
  }
}

export const storage = new MemStorage();
