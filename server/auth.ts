import { OAuth2Client } from "google-auth-library";
import { Request, Response, NextFunction } from "express";
import { IStorage } from "./storage";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    picture: string;
  };
}

export function authMiddleware(storage: IStorage) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user exists in session
      if (req.session && req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          req.user = user;
          return next();
        }
      }
      
      // No authenticated user
      return next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      return next();
    }
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid token payload");
    
    return {
      id: payload.sub,
      name: payload.name as string,
      email: payload.email as string,
      picture: payload.picture as string,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    throw new Error("Invalid token");
  }
}
