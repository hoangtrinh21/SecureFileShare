import { IStorage } from "./storage";
import { randomBytes } from "crypto";
import { User, File } from "@shared/schema";

export class FileService {
  constructor(private storage: IStorage) {}

  private calculateCodeLength(activeCodes: number): number {
    // Calculate the required code length to keep usage to 1%
    // With base62 (A-Z, a-z, 0-9), we have 62 possible chars per position
    // So for length N, we have 62^N possible codes
    // We want at most 1% of codes to be used
    
    let length = 1;
    let maxAllowedCodes = Math.floor(62 ** length * 0.01);
    
    while (activeCodes >= maxAllowedCodes) {
      length++;
      maxAllowedCodes = Math.floor(62 ** length * 0.01);
    }
    
    return length;
  }

  private generateRandomCode(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    
    // Generate `length` random bytes and map them to the allowed character set
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  public async generateUniqueCode(): Promise<string> {
    // Get count of active connection codes
    const activeFiles = await this.storage.getActiveFileCount();
    
    // Calculate required code length
    const codeLength = this.calculateCodeLength(activeFiles);
    
    // Generate a random code with the calculated length
    let code = this.generateRandomCode(codeLength);
    
    // Make sure the code is unique (very unlikely to have a collision, but let's be safe)
    let existingFile = await this.storage.getFileByConnectionCode(code);
    while (existingFile) {
      code = this.generateRandomCode(codeLength);
      existingFile = await this.storage.getFileByConnectionCode(code);
    }
    
    return code;
  }

  public async createFile(data: {
    name: string;
    size: number;
    contentType: string;
    data: string;
    userId: string;
  }): Promise<File> {
    // Generate a unique connection code
    const code = await this.generateUniqueCode();
    
    // Calculate expiry time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Create and store the file
    const file = await this.storage.createFile({
      ...data,
      connectionCode: code,
      status: "WAITING_FOR_DOWNLOAD",
      expiresAt,
    });
    
    return file;
  }

  public async getFileByCode(code: string, userId?: string): Promise<File | null> {
    // Get the file
    const file = await this.storage.getFileByConnectionCode(code);
    
    // Check if file exists and is not expired
    if (!file || file.status !== "WAITING_FOR_DOWNLOAD" || new Date() > new Date(file.expiresAt)) {
      return null;
    }
    
    // Check if the user trying to download is not the uploader
    if (userId && file.userId === userId) {
      return null;
    }
    
    return file;
  }

  public async generateDownloadUrl(fileId: number): Promise<{ url: string; expiresAt: Date }> {
    // Generate a unique download URL (using a UUID)
    const downloadToken = randomBytes(16).toString("hex");
    const url = `/api/files/download/${downloadToken}`;
    
    // Calculate expiry time (3 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3);
    
    // Update the file with the download URL and expiry
    await this.storage.updateFileDownloadUrl(fileId, url, expiresAt);
    
    return { url, expiresAt };
  }

  public async markFileAsDownloaded(fileId: number): Promise<void> {
    await this.storage.updateFileStatus(fileId, "DOWNLOADED");
  }
}
