var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";

// src/routes.ts
import cors from "cors";
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adConfig: () => adConfig,
  analytics: () => analytics,
  appConfig: () => appConfig,
  downloads: () => downloads,
  emailGateways: () => emailGateways,
  emailTemplates: () => emailTemplates,
  insertAdConfigSchema: () => insertAdConfigSchema,
  insertAnalyticsSchema: () => insertAnalyticsSchema,
  insertAppConfigSchema: () => insertAppConfigSchema,
  insertDownloadSchema: () => insertDownloadSchema,
  insertEmailGatewaySchema: () => insertEmailGatewaySchema,
  insertEmailTemplateSchema: () => insertEmailTemplateSchema,
  insertOtpVerificationSchema: () => insertOtpVerificationSchema,
  insertPremiumUserSchema: () => insertPremiumUserSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertUserSchema: () => insertUserSchema,
  otpVerificationSchema: () => otpVerificationSchema,
  otpVerifications: () => otpVerifications,
  premiumUsers: () => premiumUsers,
  purchaseFormSchema: () => purchaseFormSchema,
  sessions: () => sessions,
  siteConfig: () => siteConfig,
  subscriptionPlans: () => subscriptionPlans,
  upsertUserSchema: () => upsertUserSchema,
  users: () => users,
  videoUrlSchema: () => videoUrlSchema
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  // free, active, canceled, past_due
  subscriptionPlan: varchar("subscription_plan"),
  // basic, premium, pro
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var downloads = pgTable("downloads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  quality: text("quality").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"),
  thumbnailUrl: text("thumbnail_url"),
  author: text("author"),
  views: text("views"),
  status: text("status").notNull().default("pending"),
  // pending, downloading, completed, failed
  downloadProgress: integer("download_progress").default(0),
  filePath: text("file_path"),
  userId: varchar("user_id"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var appConfig = pgTable("app_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow()
});
var analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: varchar("event").notNull(),
  // page_view, download_start, download_complete, etc.
  platform: varchar("platform"),
  // facebook, tiktok, pinterest
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow()
});
var siteConfig = pgTable("site_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: varchar("type").notNull().default("string"),
  // string, text, boolean, number, email
  category: varchar("category").notNull().default("general"),
  // site, adsense, analytics, seo, features, email, maintenance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var adConfig = pgTable("ad_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placement: varchar("placement").notNull(),
  // header, footer, sidebar, interstitial, extra-interstitial
  adCode: text("ad_code"),
  adSenseSlot: varchar("adsense_slot"),
  // AdSense ad slot ID for web users
  adMobUnitId: varchar("admob_unit_id"),
  // AdMob ad unit ID for APK users
  adType: varchar("ad_type").default("both"),
  // adsense, admob, or both
  isEnabled: boolean("is_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});
var premiumUsers = pgTable("premium_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phoneNumber: varchar("phone_number"),
  country: varchar("country"),
  password: text("password").notNull(),
  // Auto-generated during purchase
  planId: varchar("plan_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("active"),
  // active, canceled, past_due
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  verificationToken: varchar("verification_token"),
  loginAttempts: integer("login_attempts").default(0),
  lastLoginAttempt: timestamp("last_login_attempt"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: varchar("email").notNull(),
  otpCode: varchar("otp_code").notNull(),
  code: varchar("code").notNull(),
  // Alternative field name used in service
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  attempts: integer("attempts").default(0),
  purpose: varchar("purpose").notNull().default("email_verification"),
  // email_verification, password_reset, login
  createdAt: timestamp("created_at").defaultNow()
});
var emailGateways = pgTable("email_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  // sendgrid, mailgun, smtp, etc.
  provider: varchar("provider").notNull(),
  // sendgrid, mailgun, smtp
  config: jsonb("config").notNull(),
  // API keys, SMTP settings, etc.
  isActive: boolean("is_active").default(false),
  isDefault: boolean("is_default").default(false),
  testEmail: varchar("test_email"),
  // For testing the gateway
  lastTested: timestamp("last_tested"),
  testStatus: varchar("test_status"),
  // success, failed, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  subject: varchar("subject").notNull(),
  template: text("template").notNull(),
  // HTML template with placeholders
  type: varchar("type").notNull(),
  // otp_verification, welcome, password_reset
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(),
  // in cents
  currency: varchar("currency").notNull().default("usd"),
  interval: varchar("interval").notNull().default("month"),
  // month, year
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  features: jsonb("features"),
  // Array of features
  maxVideoQuality: varchar("max_video_quality").notNull().default("high"),
  // low, medium, high, 2k, 4k
  removeAds: boolean("remove_ads").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var upsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  createdAt: true,
  completedAt: true
});
var insertAppConfigSchema = createInsertSchema(appConfig).omit({
  id: true,
  updatedAt: true
});
var insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true
});
var insertAdConfigSchema = createInsertSchema(adConfig).omit({
  id: true,
  updatedAt: true
});
var insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertPremiumUserSchema = createInsertSchema(premiumUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verificationToken: true,
  loginAttempts: true,
  lastLoginAttempt: true
});
var insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
  isUsed: true,
  attempts: true
});
var insertEmailGatewaySchema = createInsertSchema(emailGateways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTested: true,
  testStatus: true
});
var insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var videoUrlSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  quality: z.enum(["low", "medium", "high", "2k", "4k"]).optional().default("high")
});
var purchaseFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  planId: z.string().min(1, "Please select a plan"),
  paymentMethodId: z.string().min(1, "Payment method is required")
});
var otpVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otpCode: z.string().length(6, "OTP code must be 6 digits"),
  purpose: z.enum(["email_verification", "password_reset", "login"]).default("email_verification")
});

// src/storage.ts
import { eq, desc, count } from "drizzle-orm";

// src/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// src/storage.ts
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Download operations
  async getDownload(id) {
    const [download] = await db.select().from(downloads).where(eq(downloads.id, id));
    return download;
  }
  async getRecentDownloads(limit = 10) {
    return await db.select().from(downloads).orderBy(desc(downloads.createdAt)).limit(limit);
  }
  async createDownload(insertDownload) {
    const [download] = await db.insert(downloads).values(insertDownload).returning();
    return download;
  }
  async updateDownload(id, updates) {
    const [updated] = await db.update(downloads).set(updates).where(eq(downloads.id, id)).returning();
    return updated;
  }
  async deleteDownload(id) {
    const result = await db.delete(downloads).where(eq(downloads.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  // Admin operations
  async getAppConfig() {
    return await db.select().from(appConfig).orderBy(appConfig.key);
  }
  async getAppConfigByKey(key) {
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    return config;
  }
  async setAppConfig(config) {
    const [updated] = await db.insert(appConfig).values(config).onConflictDoUpdate({
      target: appConfig.key,
      set: { value: config.value, description: config.description, updatedAt: /* @__PURE__ */ new Date() }
    }).returning();
    return updated;
  }
  // Analytics operations
  async logAnalytics(analyticsData) {
    const [result] = await db.insert(analytics).values(analyticsData).returning();
    return result;
  }
  async getAnalytics(limit = 100) {
    return await db.select().from(analytics).orderBy(desc(analytics.createdAt)).limit(limit);
  }
  async getDownloadStats() {
    const [total] = await db.select({ count: count() }).from(downloads);
    const [completed] = await db.select({ count: count() }).from(downloads).where(eq(downloads.status, "completed"));
    const [failed] = await db.select({ count: count() }).from(downloads).where(eq(downloads.status, "failed"));
    return {
      totalDownloads: total.count,
      completedDownloads: completed.count,
      failedDownloads: failed.count
    };
  }
  // Ad management operations
  async getAdConfigs() {
    return await db.select().from(adConfig).orderBy(adConfig.placement);
  }
  async getAdConfigByPlacement(placement) {
    const [ad] = await db.select().from(adConfig).where(eq(adConfig.placement, placement));
    return ad;
  }
  async setAdConfig(config) {
    const [updated] = await db.insert(adConfig).values(config).onConflictDoUpdate({
      target: adConfig.placement,
      set: {
        adCode: config.adCode,
        adSenseSlot: config.adSenseSlot,
        adMobUnitId: config.adMobUnitId,
        adType: config.adType,
        isEnabled: config.isEnabled,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return updated;
  }
  // Subscription management operations
  async getSubscriptionPlans() {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.price);
  }
  async getSubscriptionPlan(id) {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }
  async createSubscriptionPlan(planData) {
    const [plan] = await db.insert(subscriptionPlans).values(planData).returning();
    return plan;
  }
  async updateSubscriptionPlan(id, updates) {
    const [updated] = await db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, id)).returning();
    return updated;
  }
  async updateSubscriptionPlanStripeIds(planId, stripeProductId, stripePriceId) {
    const [plan] = await db.update(subscriptionPlans).set({
      stripeProductId,
      stripePriceId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(subscriptionPlans.id, planId)).returning();
    return plan;
  }
  async deleteSubscriptionPlan(id) {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  async updateUserSubscription(userId, subscriptionData) {
    const [updated] = await db.update(users).set(subscriptionData).where(eq(users.id, userId)).returning();
    return updated;
  }
  // Premium user operations
  async createPremiumUser(insertPremiumUser) {
    const [user] = await db.insert(premiumUsers).values(insertPremiumUser).returning();
    return user;
  }
  async getPremiumUserByEmail(email) {
    const [user] = await db.select().from(premiumUsers).where(eq(premiumUsers.email, email));
    return user;
  }
  async markPremiumUserAsVerified(userId) {
    await db.update(premiumUsers).set({ isVerified: true }).where(eq(premiumUsers.id, userId));
  }
  async getPremiumUser(userId) {
    const [user] = await db.select().from(premiumUsers).where(eq(premiumUsers.id, userId));
    return user;
  }
  async updatePremiumUser(userId, updates) {
    await db.update(premiumUsers).set(updates).where(eq(premiumUsers.id, userId));
  }
  // OTP verification operations
  async createOtpVerification(insertOtp) {
    const [otp] = await db.insert(otpVerifications).values(insertOtp).returning();
    return otp;
  }
  async getOtpVerification(email, code, purpose) {
    const [otp] = await db.select().from(otpVerifications).where(eq(otpVerifications.email, email) && eq(otpVerifications.otpCode, code) && eq(otpVerifications.purpose, purpose));
    return otp;
  }
  async markOtpAsUsed(otpId) {
    await db.update(otpVerifications).set({ isUsed: true }).where(eq(otpVerifications.id, otpId));
  }
  // Email gateway operations
  async createEmailGateway(insertGateway) {
    const [gateway] = await db.insert(emailGateways).values(insertGateway).returning();
    return gateway;
  }
  async getEmailGateway(id) {
    const [gateway] = await db.select().from(emailGateways).where(eq(emailGateways.id, id));
    return gateway;
  }
  async getEmailGateways() {
    return await db.select().from(emailGateways).orderBy(emailGateways.name);
  }
  async getActiveEmailGateway() {
    const [gateway] = await db.select().from(emailGateways).where(eq(emailGateways.isActive, true));
    return gateway;
  }
  async updateEmailGatewayTestStatus(gatewayId, status) {
    await db.update(emailGateways).set({
      testStatus: status,
      lastTested: /* @__PURE__ */ new Date()
    }).where(eq(emailGateways.id, gatewayId));
  }
  async updateEmailGateway(gatewayId, updates) {
    await db.update(emailGateways).set(updates).where(eq(emailGateways.id, gatewayId));
  }
  // Site configuration operations
  async getSiteConfigs() {
    return await db.select().from(siteConfig).orderBy(siteConfig.category, siteConfig.key);
  }
  async getSiteConfigByKey(key) {
    const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
    return config;
  }
  async setSiteConfig(insertConfig) {
    const [config] = await db.insert(siteConfig).values(insertConfig).onConflictDoUpdate({
      target: siteConfig.key,
      set: {
        value: insertConfig.value,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return config;
  }
};
var storage = new DatabaseStorage();

// src/services/video-downloader-fixed.ts
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
var VideoDownloaderService = class {
  tempDir;
  constructor() {
    this.tempDir = path.join(process.cwd(), "temp_downloads");
    this.ensureTempDir();
  }
  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }
  detectPlatform(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.watch")) {
      return "facebook";
    } else if (urlLower.includes("tiktok.com")) {
      return "tiktok";
    } else if (urlLower.includes("pinterest.com")) {
      return "pinterest";
    } else if (urlLower.includes("instagram.com") || urlLower.includes("instagr.am")) {
      return "instagram";
    }
    return null;
  }
  async getVideoInfo(url) {
    return new Promise((resolve, reject) => {
      const ytdlp = spawn("yt-dlp", [
        "--dump-json",
        "--no-playlist",
        "--format",
        "best[ext=mp4]/best",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--add-headers",
        "Accept-Language:en-US,en;q=0.9",
        "--no-check-certificates",
        "--cookies-from-browser",
        "chrome",
        "--extractor-retries",
        "3",
        "--fragment-retries",
        "3",
        "--retry-sleep",
        "linear=1:5:2",
        url
      ]);
      let output = "";
      let errorOutput = "";
      ytdlp.stdout.on("data", (data) => {
        output += data.toString();
      });
      ytdlp.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      ytdlp.on("close", (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split("\n");
            const info = JSON.parse(lines[lines.length - 1]);
            const formats = [
              { quality: "low", fileSize: this.estimateFileSize(info.duration, "low"), format: "mp4" },
              { quality: "medium", fileSize: this.estimateFileSize(info.duration, "medium"), format: "mp4" },
              { quality: "high", fileSize: this.estimateFileSize(info.duration, "high"), format: "mp4" },
              { quality: "2k", fileSize: this.estimateFileSize(info.duration, "2k"), format: "mp4" },
              { quality: "4k", fileSize: this.estimateFileSize(info.duration, "4k"), format: "mp4" }
            ];
            resolve({
              title: info.title || "Unknown Video",
              duration: info.duration || 0,
              thumbnailUrl: info.thumbnail || info.thumbnails?.[0]?.url,
              author: info.uploader || info.channel || info.uploader_id,
              views: info.view_count ? this.formatViews(info.view_count) : void 0,
              formats
            });
          } catch (error) {
            console.error("JSON parse error:", error);
            reject(new Error(`Failed to parse video info: ${error}`));
          }
        } else {
          console.error("yt-dlp failed with code:", code);
          console.error("Error output:", errorOutput);
          const errorMessage = this.getHelpfulErrorMessage(url, errorOutput);
          reject(new Error(errorMessage));
        }
      });
      ytdlp.on("error", (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }
  getHelpfulErrorMessage(url, errorOutput) {
    const platform = this.detectPlatform(url);
    if (platform === "tiktok") {
      if (errorOutput.includes("status code 10204") || errorOutput.includes("Video not available")) {
        return "Unable to access this TikTok video. It may be private, deleted, or region-restricted.";
      }
    }
    if (platform === "facebook") {
      if (errorOutput.includes("No video formats found")) {
        return "Unable to access this Facebook video. It may be private or require login.";
      }
    }
    if (platform === "instagram" || platform === "pinterest") {
      if (errorOutput.includes("login") || errorOutput.includes("Sign in")) {
        return `Unable to access this ${platform} content. The video may be private or require authentication.`;
      }
    }
    if (errorOutput.includes("Video unavailable") || errorOutput.includes("Private video")) {
      return "Video is unavailable, private, or may have been deleted.";
    }
    if (errorOutput.includes("Sign in") || errorOutput.includes("login")) {
      return "Video requires authentication to access. Please try a public video.";
    }
    return "Unable to process video. Please check the URL and try again.";
  }
  estimateFileSize(duration, quality) {
    if (!duration) return 1e7;
    const bitrates = {
      low: 5e5,
      // ~0.5 Mbps
      medium: 1e6,
      // ~1 Mbps  
      high: 2e6,
      // ~2 Mbps
      "2k": 4e6,
      // ~4 Mbps
      "4k": 8e6
      // ~8 Mbps
    };
    const bitrate = bitrates[quality] || bitrates.medium;
    return Math.floor(duration * bitrate / 8);
  }
  formatViews(views) {
    if (views >= 1e6) {
      return `${(views / 1e6).toFixed(1)}M`;
    } else if (views >= 1e3) {
      return `${(views / 1e3).toFixed(1)}K`;
    }
    return views.toString();
  }
  async downloadVideoTemporarily(url, quality, onProgress) {
    const timestamp2 = Date.now();
    const uniqueId = randomBytes(8).toString("hex");
    const filename = `video_${timestamp2}_${uniqueId}`;
    const outputTemplate = path.join(this.tempDir, `${filename}.%(ext)s`);
    const qualityMap = {
      high: "best[height<=1080][ext=mp4]/best[ext=mp4]/best",
      medium: "best[height<=720][ext=mp4]/best[height<=720]/worstvideo[height>=480][ext=mp4]",
      low: "worst[height>=360][ext=mp4]/worst[ext=mp4]/worst",
      "2k": "best[height<=1440][ext=mp4]/best[height<=1440]/best[ext=mp4]",
      "4k": "best[height<=2160][ext=mp4]/best[height<=2160]/best[ext=mp4]"
    };
    return new Promise((resolve, reject) => {
      const ytdlp = spawn("yt-dlp", [
        "--format",
        qualityMap[quality] || "best[ext=mp4]/best",
        "--output",
        outputTemplate,
        "--newline",
        "--no-warnings",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--add-headers",
        "Accept-Language:en-US,en;q=0.9",
        "--no-check-certificates",
        "--cookies-from-browser",
        "chrome",
        "--extractor-retries",
        "3",
        "--fragment-retries",
        "3",
        "--retry-sleep",
        "linear=1:5:2",
        url
      ]);
      let errorOutput = "";
      let lastProgress = 0;
      ytdlp.stdout.on("data", (data) => {
        const output = data.toString();
        const lines = output.split("\n");
        for (const line of lines) {
          const progressMatch = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
          if (progressMatch && onProgress) {
            const progress = parseFloat(progressMatch[1]);
            if (progress > lastProgress) {
              lastProgress = progress;
              onProgress(progress);
            }
          }
        }
      });
      ytdlp.stderr.on("data", (data) => {
        const error = data.toString();
        errorOutput += error;
        const progressMatch = error.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (progressMatch && onProgress) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });
      ytdlp.on("close", async (code) => {
        if (code === 0) {
          try {
            const files = await fs.readdir(this.tempDir);
            const downloadedFile = files.find((file) => file.startsWith(`video_${timestamp2}_${uniqueId}`));
            if (downloadedFile) {
              const filePath = path.join(this.tempDir, downloadedFile);
              const stats = await fs.stat(filePath);
              const cleanup = async () => {
                try {
                  await fs.unlink(filePath);
                } catch (error) {
                  console.error("Failed to cleanup file:", error);
                }
              };
              resolve({
                filePath,
                fileSize: stats.size,
                cleanup
              });
            } else {
              reject(new Error("Downloaded file not found"));
            }
          } catch (error) {
            reject(new Error(`Failed to find downloaded file: ${error}`));
          }
        } else {
          const errorMessage = this.getHelpfulErrorMessage(url, errorOutput);
          reject(new Error(errorMessage));
        }
      });
      ytdlp.on("error", (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }
};

// src/routes.ts
import bcrypt from "bcryptjs";
import { z as z2 } from "zod";
import Stripe from "stripe";
var videoDownloader = new VideoDownloaderService();
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});
var loginSchema = z2.object({
  username: z2.string().min(1, "Username is required"),
  password: z2.string().min(1, "Password is required")
});
function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD_HASH;
  if (!username || !password) {
    throw new Error("Missing admin credentials: ADMIN_USERNAME and ADMIN_PASSWORD_HASH must be set");
  }
  return {
    username,
    password,
    id: "env-admin-001",
    isAdmin: true
  };
}
async function authenticateAdmin(username, password) {
  try {
    const user = await storage.getUserByUsername(username);
    if (user && user.isAdmin) {
      return await bcrypt.compare(password, user.password);
    }
  } catch (error) {
    console.warn("Database authentication failed, trying environment credentials:", error);
  }
  try {
    const adminCreds = getAdminCredentials();
    if (username === adminCreds.username) {
      return await bcrypt.compare(password, adminCreds.password);
    }
  } catch (error) {
    console.error("Environment admin authentication failed:", error);
  }
  return false;
}
async function registerRoutes(app2) {
  app2.use(cors({
    origin: process.env.NODE_ENV === "production" ? ["https://your-cpanel-domain.com", "https://www.your-cpanel-domain.com"] : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  }));
  app2.post("/api/auth/login", async (req, res) => {
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
            email: dbUser.email || "admin@socialgrab.app",
            isAdmin: dbUser.isAdmin || false,
            password: dbUser.password
          };
        }
      } catch (error) {
        console.warn("Database user lookup failed, using environment admin:", error);
      }
      if (!user) {
        try {
          const adminCreds = getAdminCredentials();
          user = {
            id: adminCreds.id,
            username: adminCreds.username,
            email: "admin@socialgrab.app",
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
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        res.cookie("adminAuth", "true", {
          httpOnly: false,
          maxAge: 1e3 * 60 * 60 * 24,
          sameSite: "lax"
        });
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email || "admin@socialgrab.app",
            isAdmin: user.isAdmin
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      if (req.session.userId === "env-admin-001") {
        return res.json({
          id: req.session.userId,
          username: req.session.username,
          email: "admin@socialgrab.app",
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
      console.error("Auth check error:", error);
      if (req.session.username && req.session.userId) {
        return res.json({
          id: req.session.userId,
          username: req.session.username,
          email: "admin@socialgrab.app",
          isAdmin: req.session.isAdmin || true
        });
      }
      res.status(500).json({ message: "Failed to get user info" });
    }
  });
  app2.get("/api/downloads", async (req, res) => {
    try {
      const downloads2 = await storage.getRecentDownloads(10);
      res.json(downloads2);
    } catch (error) {
      console.warn("Database not available for downloads:", error.message);
      res.json([]);
    }
  });
  app2.post("/api/video/info", async (req, res) => {
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
  app2.post("/api/video/download", async (req, res) => {
    try {
      const { url, quality } = videoUrlSchema.parse(req.body);
      const platform = videoDownloader.detectPlatform(url);
      if (!platform) {
        return res.status(400).json({
          message: "Unsupported platform. Please use Facebook, TikTok, Pinterest, or Instagram URLs."
        });
      }
      if ((quality === "2k" || quality === "4k") && !req.headers.authorization) {
        return res.status(402).json({
          message: "Premium subscription required for 2K and 4K video downloads.",
          upgradeRequired: true,
          requiredPlan: "premium"
        });
      }
      const videoInfo = await videoDownloader.getVideoInfo(url);
      if (!videoInfo) {
        return res.status(400).json({ message: "Failed to get video information" });
      }
      const downloadId = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        await storage.createDownload({
          url,
          platform,
          quality,
          title: videoInfo.title,
          status: "pending",
          fileSize: videoInfo.formats.find((f) => f.quality === quality)?.fileSize || 0
        });
      } catch (error) {
        console.warn("Failed to store download record:", error);
      }
      res.json({
        downloadId,
        message: "Download started",
        videoInfo
      });
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
        try {
          await storage.updateDownload(downloadId, { status: "completed" });
        } catch (error) {
          console.warn("Failed to update download status:", error);
        }
        setTimeout(() => {
          downloadResult.cleanup().catch(console.error);
        }, 3e5);
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
  app2.get("/api/video/download/:downloadId", async (req, res) => {
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
  app2.get("/api/public/config", async (req, res) => {
    try {
      const configs = await storage.getAppConfig();
      res.json(configs);
    } catch (error) {
      console.warn("Database not available for configs:", error.message);
      res.json([
        { id: "ga4_measurement_id", key: "ga4_measurement_id", value: process.env.GOOGLE_ANALYTICS_ID || "", description: "Google Analytics 4 Measurement ID", type: "string", category: "analytics" }
      ]);
    }
  });
  app2.get("/api/public/ads", async (req, res) => {
    try {
      const ads = await storage.getAdConfigs();
      res.json(ads);
    } catch (error) {
      console.warn("Database not available for ads:", error.message);
      res.json([]);
    }
  });
  return createServer(app2);
}

// src/index.ts
var log = console.log;
var MemoryStoreSession = MemoryStore(session);
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "SocialGrab-Session-Secret-2024",
  store: new MemoryStoreSession({
    checkPeriod: 864e5
    // prune expired entries every 24h
  }),
  resave: true,
  // Force session save
  saveUninitialized: true,
  // Create session for all requests
  name: "connect.sid",
  // Use default session name
  cookie: {
    secure: false,
    // Set to true if using HTTPS
    httpOnly: false,
    // Allow JS access for debugging  
    maxAge: 1e3 * 60 * 60 * 24,
    // 24 hours
    sameSite: "lax"
    // Remove domain setting completely for localhost
  }
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
