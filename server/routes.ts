import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware, requireAuth, verifyGoogleToken, AuthenticatedRequest } from "./auth";
import { FileService } from "./fileService";
import { CodeService } from "./codeService";
import multer from "multer";
import session from "express-session";
import { z } from "zod";
import path from "path";

// Create services
const fileService = new FileService(storage);
const codeService = new CodeService(storage);

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || "FileShare-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(session(sessionConfig));
  
  // Set up authentication middleware
  app.use(authMiddleware(storage));
  
  // Auth routes
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: "Credential is required" });
      }
      
      // Verify token
      const userData = await verifyGoogleToken(credential);
      
      // Check if user exists, create if not
      let user = await storage.getUserById(userData.id);
      
      if (!user) {
        user = await storage.createUser(userData);
      }
      
      // Set user ID in session
      req.session.userId = user.id;
      
      return res.status(200).json(user);
    } catch (error) {
      console.error("Google auth error:", error);
      return res.status(401).json({ message: "Authentication failed" });
    }
  });
  
  app.get("/api/auth/me", (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      return res.status(200).json(req.user);
    }
    return res.status(401).json({ message: "Not authenticated" });
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // File upload route
  app.post(
    "/api/files/upload",
    requireAuth,
    upload.single("file"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Convert file to base64
        const fileData = req.file.buffer.toString("base64");
        
        // Create file entry
        const file = await fileService.createFile({
          name: req.file.originalname,
          size: req.file.size,
          contentType: req.file.mimetype,
          data: fileData,
          userId: req.user!.id,
        });
        
        return res.status(201).json({ 
          message: "File uploaded successfully",
          code: file.connectionCode,
        });
      } catch (error) {
        console.error("File upload error:", error);
        return res.status(500).json({ message: "Failed to upload file" });
      }
    }
  );
  
  // Verify connection code route
  app.post("/api/files/verify", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const codeSchema = z.object({
        code: z.string().min(1),
      });
      
      const parsed = codeSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid code format" });
      }
      
      const { code } = parsed.data;
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      
      // Check if IP is timed out
      const timeoutCheck = await codeService.checkTimeout(ip);
      if (timeoutCheck.locked) {
        return res.status(429).json({
          message: "Too many incorrect attempts. Please try again later.",
          timeoutSeconds: timeoutCheck.timeoutSeconds,
        });
      }
      
      // Verify the code
      const file = await fileService.getFileByCode(code, req.user?.id);
      
      if (!file) {
        // Record failed attempt
        const result = await codeService.recordFailedAttempt(ip);
        
        if (result.locked) {
          return res.status(429).json({
            message: "Too many incorrect attempts. Please try again later.",
            timeoutSeconds: result.timeoutSeconds,
          });
        }
        
        return res.status(404).json({
          message: "Invalid connection code. Please try again.",
          attemptsLeft: result.attemptsLeft,
        });
      }
      
      // Code is valid - reset failed attempts
      await codeService.resetFailedAttempts(ip);
      
      // Generate download URL
      const { url, expiresAt } = await fileService.generateDownloadUrl(file.id);
      
      return res.status(200).json({
        name: file.name,
        size: file.size,
        downloadUrl: url,
        expiresAt,
      });
    } catch (error) {
      console.error("Code verification error:", error);
      return res.status(500).json({ message: "Failed to verify code" });
    }
  });
  
  // File download route
  app.get("/api/files/download/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find file with this download token
      const files = Array.from(storage.files.values());
      const file = files.find(f => f.downloadUrl === `/api/files/download/${token}`);
      
      if (!file || file.status !== "WAITING_FOR_DOWNLOAD") {
        return res.status(404).json({ message: "File not found or already downloaded" });
      }
      
      // Check if download URL is expired
      if (!file.downloadExpiresAt || new Date() > new Date(file.downloadExpiresAt)) {
        return res.status(410).json({ message: "Download link has expired" });
      }
      
      // Mark file as downloaded
      await fileService.markFileAsDownloaded(file.id);
      
      // Decode file data
      const fileBuffer = Buffer.from(file.data, "base64");
      
      // Set content disposition and type
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.name)}"`);
      res.setHeader("Content-Type", file.contentType);
      
      // Send file
      return res.send(fileBuffer);
    } catch (error) {
      console.error("File download error:", error);
      return res.status(500).json({ message: "Failed to download file" });
    }
  });
  
  // Mark file as downloaded (when download starts)
  app.post("/api/files/downloaded", async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Connection code is required" });
      }
      
      const file = await storage.getFileByConnectionCode(code);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Mark file as downloaded
      await fileService.markFileAsDownloaded(file.id);
      
      return res.status(200).json({ message: "File marked as downloaded" });
    } catch (error) {
      console.error("Mark downloaded error:", error);
      return res.status(500).json({ message: "Failed to mark file as downloaded" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
