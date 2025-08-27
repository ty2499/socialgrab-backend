import type { Express, Request, Response } from "express";
import express from "express";
import cors from "cors";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Extend Express Session to include custom properties
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
    isAdmin?: boolean;
  }
}

// Simplified video URL schema
const videoUrlSchema = z.object({
  url: z.string().url(),
  quality: z.string().optional()
});

// Login schema for validation
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

// Admin credentials from environment variables
function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD_HASH;
  
  if (!username || !password) {
    throw new Error('Missing admin credentials: ADMIN_USERNAME and ADMIN_PASSWORD_HASH must be set');
  }
  
  return {
    username,
    password,
    id: 'env-admin-001',
    isAdmin: true
  };
}

// Admin authentication - database first, environment fallback
async function authenticateAdmin(username: string, password: string): Promise<boolean> {
  // First try database authentication
  try {
    const user = await storage.getUserByUsername(username);
    if (user && user.isAdmin) {
      return await bcrypt.compare(password, user.password);
    }
  } catch (error) {
    console.warn('Database authentication failed, trying environment credentials:', error);
  }
  
  // Fallback to environment credentials if database fails
  try {
    const adminCreds = getAdminCredentials();
    if (username === adminCreds.username) {
      return await bcrypt.compare(password, adminCreds.password);
    }
  } catch (error) {
    console.error('Environment admin authentication failed:', error);
  }
  
  return false;
}

// Middleware to check if user is authenticated admin
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session?.userId || !req.session?.isAdmin) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure CORS for production deployment
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-cpanel-domain.com', 'https://www.your-cpanel-domain.com']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  // Authentication routes (keeping existing admin auth)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const isAuthenticated = await authenticateAdmin(username, password);
      if (!isAuthenticated) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      let user = null;
      try {
        const dbUser = await storage.getUserByUsername(username);
        if (dbUser) {
          user = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email || 'admin@socialgrab.app',
            isAdmin: dbUser.isAdmin || false,
            password: dbUser.password
          };
        }
      } catch (error) {
        console.warn('Database user lookup failed, using environment admin:', error);
      }
      
      if (!user) {
        try {
          const adminCreds = getAdminCredentials();
          user = {
            id: adminCreds.id,
            username: adminCreds.username,
            email: 'admin@socialgrab.app',
            isAdmin: true,
            password: adminCreds.password
          };
        } catch (error) {
          return res.status(500).json({ message: "Admin configuration error" });
        }
      }
      
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.isAdmin || false;
      
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        res.cookie('adminAuth', 'true', { 
          httpOnly: false, 
          maxAge: 1000 * 60 * 60 * 24,
          sameSite: 'lax'
        });
        
        res.json({ 
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email || 'admin@socialgrab.app',
            isAdmin: user.isAdmin
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err?: any) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      if (req.session.userId === 'env-admin-001') {
        return res.json({
          id: req.session.userId,
          username: req.session.username,
          email: 'admin@socialgrab.app',
          isAdmin: req.session.isAdmin
        });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Auth check error:', error);
      if (req.session.username && req.session.userId) {
        return res.json({
          id: req.session.userId,
          username: req.session.username,
          email: 'admin@socialgrab.app',
          isAdmin: req.session.isAdmin || true
        });
      }
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

  // Get recent downloads
  app.get("/api/downloads", async (req, res) => {
    try {
      const downloads = await storage.getRecentDownloads(10);
      res.json(downloads);
    } catch (error) {
      console.warn("Database not available for downloads:", (error as Error).message);
      res.json([]);
    }
  });

  // Get video info
  app.post("/api/video/info", async (req, res) => {
    try {
      const { url } = videoUrlSchema.parse(req.body);
      
      const platform = videoDownloader.detectPlatform(url);
      if (!platform) {
        return res.status(400).json({ 
          message: "Unsupported platform. Please use Facebook, TikTok, Pinterest, or Instagram URLs." 
        });
      }

      const videoInfo = await videoDownloader.getVideoInfo(url);
      
      res.json({
        ...videoInfo,
        platform,
        url
      });
    } catch (error) {
      console.error("Error getting video info:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to get video information" 
      });
    }
  });

  // Download video
  app.post("/api/video/download", async (req, res) => {
    try {
      const { url, quality } = videoUrlSchema.parse(req.body);
      
      const platform = videoDownloader.detectPlatform(url);
      if (!platform) {
        return res.status(400).json({ 
          message: "Unsupported platform. Please use Facebook, TikTok, Pinterest, or Instagram URLs." 
        });
      }

      // Check if quality requires subscription
      if ((quality === "2k" || quality === "4k") && !req.headers.authorization) {
        return res.status(402).json({ 
          message: "Premium subscription required for 2K and 4K video downloads.",
          upgradeRequired: true,
          requiredPlan: "premium"
        });
      }

      // Get video info first
      const videoInfo = await videoDownloader.getVideoInfo(url);
      
      if (!videoInfo) {
        return res.status(400).json({ message: "Failed to get video information" });
      }

      // Generate download ID
      const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store download record
      try {
        await storage.createDownload({
          url,
          platform,
          quality,
          title: videoInfo.title,
          status: "pending",
          fileSize: videoInfo.formats.find(f => f.quality === quality)?.fileSize || 0
        });
      } catch (error) {
        console.warn("Failed to store download record:", error);
      }

      // Start download process
      res.json({ 
        downloadId,
        message: "Download started",
        videoInfo
      });

      // Process download in background
      try {
        const downloadResult = await videoDownloader.downloadVideoTemporarily(
          url, 
          quality,
          async (progress) => {
            try {
              await storage.updateDownload(downloadId, { status: "downloading" });
            } catch (error) {
              console.warn("Failed to update download progress:", error);
            }
          }
        );

        // Update download status to completed
        try {
          await storage.updateDownload(downloadId, { status: "completed" });
        } catch (error) {
          console.warn("Failed to update download status:", error);
        }

        // Clean up file after some time
        setTimeout(() => {
          downloadResult.cleanup().catch(console.error);
        }, 300000); // 5 minutes

      } catch (error) {
        console.error("Download failed:", error);
        try {
          await storage.updateDownload(downloadId, { status: "failed" });
        } catch (updateError) {
          console.warn("Failed to update download status:", updateError);
        }
      }

    } catch (error) {
      console.error("Error starting download:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to start download" 
      });
    }
  });

  // Get download status
  app.get("/api/video/download/:downloadId", async (req, res) => {
    try {
      const { downloadId } = req.params;
      const download = await storage.getDownload(downloadId);
      
      if (!download) {
        return res.status(404).json({ message: "Download not found" });
      }

      res.json(download);
    } catch (error) {
      console.error("Error getting download status:", error);
      res.status(500).json({ message: "Failed to get download status" });
    }
  });

  // Get public configuration
  app.get("/api/public/config", async (req, res) => {
    try {
      const configs = await storage.getAppConfig();
      res.json(configs);
    } catch (error) {
      console.warn("Database not available for configs:", (error as Error).message);
      res.json([
        { id: "ga4_measurement_id", key: "ga4_measurement_id", value: process.env.GOOGLE_ANALYTICS_ID || "", description: "Google Analytics 4 Measurement ID", type: "string", category: "analytics" }
      ]);
    }
  });

  // Get public ads
  app.get("/api/public/ads", async (req, res) => {
    try {
      const ads = await storage.getAdConfigs();
      res.json(ads);
    } catch (error) {
      console.warn("Database not available for ads:", (error as Error).message);
      res.json([]);
    }
  });

  return createServer(app);
}