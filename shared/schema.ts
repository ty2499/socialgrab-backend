import { z } from "zod";

// Session storage table for auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
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
  subscriptionStatus: varchar("subscription_status").default("free"), // free, active, canceled, past_due
  subscriptionPlan: varchar("subscription_plan"), // basic, premium, pro
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const downloads = pgTable("downloads", {
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
  status: text("status").notNull().default("pending"), // pending, downloading, completed, failed
  downloadProgress: integer("download_progress").default(0),
  filePath: text("file_path"),
  userId: varchar("user_id"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// App configuration table for admin customization
export const appConfig = pgTable("app_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics and logging table
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  event: varchar("event").notNull(), // page_view, download_start, download_complete, etc.
  platform: varchar("platform"), // facebook, tiktok, pinterest
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site configuration table for admin settings
export const siteConfig = pgTable("site_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  type: varchar("type").notNull().default("string"), // string, text, boolean, number, email
  category: varchar("category").notNull().default("general"), // site, adsense, analytics, seo, features, email, maintenance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad configuration table
export const adConfig = pgTable("ad_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placement: varchar("placement").notNull(), // header, footer, sidebar, interstitial, extra-interstitial
  adCode: text("ad_code"),
  adSenseSlot: varchar("adsense_slot"), // AdSense ad slot ID for web users
  adMobUnitId: varchar("admob_unit_id"), // AdMob ad unit ID for APK users
  adType: varchar("ad_type").default("both"), // adsense, admob, or both
  isEnabled: boolean("is_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Premium users table - automatically created during purchase
export const premiumUsers = pgTable("premium_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phoneNumber: varchar("phone_number"),
  country: varchar("country"),
  password: text("password").notNull(), // Auto-generated during purchase
  planId: varchar("plan_id").notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("active"), // active, canceled, past_due
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  verificationToken: varchar("verification_token"),
  loginAttempts: integer("login_attempts").default(0),
  lastLoginAttempt: timestamp("last_login_attempt"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP verification table for premium users
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: varchar("email").notNull(),
  otpCode: varchar("otp_code").notNull(),
  code: varchar("code").notNull(), // Alternative field name used in service
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  attempts: integer("attempts").default(0),
  purpose: varchar("purpose").notNull().default("email_verification"), // email_verification, password_reset, login
  createdAt: timestamp("created_at").defaultNow(),
});

// Email gateway configuration table
export const emailGateways = pgTable("email_gateways", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(), // sendgrid, mailgun, smtp, etc.
  provider: varchar("provider").notNull(), // sendgrid, mailgun, smtp
  config: jsonb("config").notNull(), // API keys, SMTP settings, etc.
  isActive: boolean("is_active").default(false),
  isDefault: boolean("is_default").default(false),
  testEmail: varchar("test_email"), // For testing the gateway
  lastTested: timestamp("last_tested"),
  testStatus: varchar("test_status"), // success, failed, pending
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  subject: varchar("subject").notNull(),
  template: text("template").notNull(), // HTML template with placeholders
  type: varchar("type").notNull(), // otp_verification, welcome, password_reset
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  currency: varchar("currency").notNull().default("usd"),
  interval: varchar("interval").notNull().default("month"), // month, year
  stripeProductId: varchar("stripe_product_id"),
  stripePriceId: varchar("stripe_price_id"),
  features: jsonb("features"), // Array of features
  maxVideoQuality: varchar("max_video_quality").notNull().default("high"), // low, medium, high, 2k, 4k
  removeAds: boolean("remove_ads").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDownloadSchema = createInsertSchema(downloads).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAppConfigSchema = createInsertSchema(appConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export const insertAdConfigSchema = createInsertSchema(adConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPremiumUserSchema = createInsertSchema(premiumUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isVerified: true,
  verificationToken: true,
  loginAttempts: true,
  lastLoginAttempt: true,
});

export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({
  id: true,
  createdAt: true,
  isUsed: true,
  attempts: true,
});

export const insertEmailGatewaySchema = createInsertSchema(emailGateways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTested: true,
  testStatus: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const videoUrlSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  quality: z.enum(["low", "medium", "high", "2k", "4k"]).optional().default("high"),
});

// Purchase form schema for automatic account creation
export const purchaseFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  planId: z.string().min(1, "Please select a plan"),
  paymentMethodId: z.string().min(1, "Payment method is required"),
});

// OTP verification schema
export const otpVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otpCode: z.string().length(6, "OTP code must be 6 digits"),
  purpose: z.enum(["email_verification", "password_reset", "login"]).default("email_verification"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type Download = typeof downloads.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type AdConfig = typeof adConfig.$inferSelect;
export type InsertAdConfig = z.infer<typeof insertAdConfigSchema>;
export type SiteConfig = typeof siteConfig.$inferSelect;
export type InsertSiteConfig = typeof siteConfig.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type PremiumUser = typeof premiumUsers.$inferSelect;
export type InsertPremiumUser = z.infer<typeof insertPremiumUserSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type EmailGateway = typeof emailGateways.$inferSelect;
export type InsertEmailGateway = z.infer<typeof insertEmailGatewaySchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type VideoUrlRequest = z.infer<typeof videoUrlSchema>;
export type PurchaseFormData = z.infer<typeof purchaseFormSchema>;
export type OtpVerificationData = z.infer<typeof otpVerificationSchema>;
