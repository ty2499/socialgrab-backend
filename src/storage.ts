import { 
  users, 
  downloads, 
  appConfig, 
  analytics, 
  adConfig,
  subscriptionPlans,
  premiumUsers,
  otpVerifications,
  emailGateways,
  emailTemplates,
  siteConfig,
  type User, 
  type InsertUser, 
  type Download, 
  type InsertDownload,
  type AppConfig,
  type InsertAppConfig,
  type Analytics,
  type InsertAnalytics,
  type AdConfig,
  type InsertAdConfig,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type PremiumUser,
  type InsertPremiumUser,
  type OtpVerification,
  type InsertOtpVerification,
  type EmailGateway,
  type InsertEmailGateway,
  type EmailTemplate,
  type InsertEmailTemplate,
  type SiteConfig,
  type InsertSiteConfig
} from "@shared/schema";
import { eq, desc, count } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Download operations
  getDownload(id: string): Promise<Download | undefined>;
  getRecentDownloads(limit?: number): Promise<Download[]>;
  createDownload(download: InsertDownload): Promise<Download>;
  updateDownload(id: string, updates: Partial<Download>): Promise<Download | undefined>;
  deleteDownload(id: string): Promise<boolean>;
  
  // Admin operations
  getAppConfig(): Promise<AppConfig[]>;
  getAppConfigByKey(key: string): Promise<AppConfig | undefined>;
  setAppConfig(config: InsertAppConfig): Promise<AppConfig>;
  
  // Analytics operations
  logAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  getAnalytics(limit?: number): Promise<Analytics[]>;
  getDownloadStats(): Promise<{ totalDownloads: number; completedDownloads: number; failedDownloads: number; }>;
  
  // Ad management operations
  getAdConfigs(): Promise<AdConfig[]>;
  getAdConfigByPlacement(placement: string): Promise<AdConfig | undefined>;
  setAdConfig(config: InsertAdConfig): Promise<AdConfig>;
  
  // Subscription management operations
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  updateSubscriptionPlanStripeIds(planId: string, stripeProductId: string, stripePriceId: string): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;
  updateUserSubscription(userId: string, subscriptionData: { 
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<User | undefined>;
  
  // Premium user operations
  createPremiumUser(user: InsertPremiumUser): Promise<PremiumUser>;
  getPremiumUserByEmail(email: string): Promise<PremiumUser | undefined>;
  markPremiumUserAsVerified(userId: string): Promise<void>;
  
  // OTP verification operations
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  getOtpVerification(email: string, code: string, purpose: string): Promise<OtpVerification | undefined>;
  markOtpAsUsed(otpId: string): Promise<void>;
  
  // Email gateway operations
  createEmailGateway(gateway: InsertEmailGateway): Promise<EmailGateway>;
  getEmailGateway(id: string): Promise<EmailGateway | undefined>;
  getEmailGateways(): Promise<EmailGateway[]>;
  getActiveEmailGateway(): Promise<EmailGateway | undefined>;
  updateEmailGatewayTestStatus(gatewayId: string, status: string): Promise<void>;
  
  // Site configuration operations
  getSiteConfigs(): Promise<SiteConfig[]>;
  getSiteConfigByKey(key: string): Promise<SiteConfig | undefined>;
  setSiteConfig(config: InsertSiteConfig): Promise<SiteConfig>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Download operations
  async getDownload(id: string): Promise<Download | undefined> {
    const [download] = await db.select().from(downloads).where(eq(downloads.id, id));
    return download;
  }

  async getRecentDownloads(limit: number = 10): Promise<Download[]> {
    return await db.select().from(downloads).orderBy(desc(downloads.createdAt)).limit(limit);
  }

  async createDownload(insertDownload: InsertDownload): Promise<Download> {
    const [download] = await db.insert(downloads).values(insertDownload).returning();
    return download;
  }

  async updateDownload(id: string, updates: Partial<Download>): Promise<Download | undefined> {
    const [updated] = await db.update(downloads).set(updates).where(eq(downloads.id, id)).returning();
    return updated;
  }

  async deleteDownload(id: string): Promise<boolean> {
    const result = await db.delete(downloads).where(eq(downloads.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Admin operations
  async getAppConfig(): Promise<AppConfig[]> {
    return await db.select().from(appConfig).orderBy(appConfig.key);
  }

  async getAppConfigByKey(key: string): Promise<AppConfig | undefined> {
    const [config] = await db.select().from(appConfig).where(eq(appConfig.key, key));
    return config;
  }

  async setAppConfig(config: InsertAppConfig): Promise<AppConfig> {
    const [updated] = await db.insert(appConfig).values(config).onConflictDoUpdate({
      target: appConfig.key,
      set: { value: config.value, description: config.description, updatedAt: new Date() }
    }).returning();
    return updated;
  }

  // Analytics operations
  async logAnalytics(analyticsData: InsertAnalytics): Promise<Analytics> {
    const [result] = await db.insert(analytics).values(analyticsData).returning();
    return result;
  }

  async getAnalytics(limit: number = 100): Promise<Analytics[]> {
    return await db.select().from(analytics).orderBy(desc(analytics.createdAt)).limit(limit);
  }

  async getDownloadStats(): Promise<{ totalDownloads: number; completedDownloads: number; failedDownloads: number; }> {
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
  async getAdConfigs(): Promise<AdConfig[]> {
    return await db.select().from(adConfig).orderBy(adConfig.placement);
  }

  async getAdConfigByPlacement(placement: string): Promise<AdConfig | undefined> {
    const [ad] = await db.select().from(adConfig).where(eq(adConfig.placement, placement));
    return ad;
  }

  async setAdConfig(config: InsertAdConfig): Promise<AdConfig> {
    const [updated] = await db.insert(adConfig).values(config).onConflictDoUpdate({
      target: adConfig.placement,
      set: { 
        adCode: config.adCode, 
        adSenseSlot: config.adSenseSlot,
        adMobUnitId: config.adMobUnitId,
        adType: config.adType,
        isEnabled: config.isEnabled, 
        updatedAt: new Date() 
      }
    }).returning();
    return updated;
  }

  // Subscription management operations
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.price);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async createSubscriptionPlan(planData: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [plan] = await db.insert(subscriptionPlans).values(planData).returning();
    return plan;
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, id)).returning();
    return updated;
  }

  async updateSubscriptionPlanStripeIds(planId: string, stripeProductId: string, stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set({ 
        stripeProductId, 
        stripePriceId, 
        updatedAt: new Date() 
      })
      .where(eq(subscriptionPlans.id, planId))
      .returning();
    return plan;
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    const result = await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateUserSubscription(userId: string, subscriptionData: { 
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    subscriptionPlan?: string;
  }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(subscriptionData).where(eq(users.id, userId)).returning();
    return updated;
  }

  // Premium user operations
  async createPremiumUser(insertPremiumUser: InsertPremiumUser): Promise<PremiumUser> {
    const [user] = await db.insert(premiumUsers).values(insertPremiumUser).returning();
    return user;
  }

  async getPremiumUserByEmail(email: string): Promise<PremiumUser | undefined> {
    const [user] = await db.select().from(premiumUsers).where(eq(premiumUsers.email, email));
    return user;
  }

  async markPremiumUserAsVerified(userId: string): Promise<void> {
    await db.update(premiumUsers)
      .set({ isVerified: true })
      .where(eq(premiumUsers.id, userId));
  }

  async getPremiumUser(userId: string): Promise<PremiumUser | undefined> {
    const [user] = await db.select().from(premiumUsers).where(eq(premiumUsers.id, userId));
    return user;
  }

  async updatePremiumUser(userId: string, updates: Partial<PremiumUser>): Promise<void> {
    await db.update(premiumUsers)
      .set(updates)
      .where(eq(premiumUsers.id, userId));
  }

  // OTP verification operations
  async createOtpVerification(insertOtp: InsertOtpVerification): Promise<OtpVerification> {
    const [otp] = await db.insert(otpVerifications).values(insertOtp).returning();
    return otp;
  }

  async getOtpVerification(email: string, code: string, purpose: string): Promise<OtpVerification | undefined> {
    const [otp] = await db.select()
      .from(otpVerifications)
      .where(eq(otpVerifications.email, email) && eq(otpVerifications.otpCode, code) && eq(otpVerifications.purpose, purpose));
    return otp;
  }

  async markOtpAsUsed(otpId: string): Promise<void> {
    await db.update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otpId));
  }

  // Email gateway operations
  async createEmailGateway(insertGateway: InsertEmailGateway): Promise<EmailGateway> {
    const [gateway] = await db.insert(emailGateways).values(insertGateway).returning();
    return gateway;
  }

  async getEmailGateway(id: string): Promise<EmailGateway | undefined> {
    const [gateway] = await db.select().from(emailGateways).where(eq(emailGateways.id, id));
    return gateway;
  }

  async getEmailGateways(): Promise<EmailGateway[]> {
    return await db.select().from(emailGateways).orderBy(emailGateways.name);
  }

  async getActiveEmailGateway(): Promise<EmailGateway | undefined> {
    const [gateway] = await db.select()
      .from(emailGateways)
      .where(eq(emailGateways.isActive, true));
    return gateway;
  }

  async updateEmailGatewayTestStatus(gatewayId: string, status: string): Promise<void> {
    await db.update(emailGateways)
      .set({ 
        testStatus: status,
        lastTested: new Date()
      })
      .where(eq(emailGateways.id, gatewayId));
  }

  async updateEmailGateway(gatewayId: string, updates: Partial<EmailGateway>): Promise<void> {
    await db.update(emailGateways)
      .set(updates)
      .where(eq(emailGateways.id, gatewayId));
  }

  // Site configuration operations
  async getSiteConfigs(): Promise<SiteConfig[]> {
    return await db.select().from(siteConfig).orderBy(siteConfig.category, siteConfig.key);
  }

  async getSiteConfigByKey(key: string): Promise<SiteConfig | undefined> {
    const [config] = await db.select().from(siteConfig).where(eq(siteConfig.key, key));
    return config;
  }

  async setSiteConfig(insertConfig: InsertSiteConfig): Promise<SiteConfig> {
    const [config] = await db.insert(siteConfig)
      .values(insertConfig)
      .onConflictDoUpdate({
        target: siteConfig.key,
        set: {
          value: insertConfig.value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return config;
  }
}

export const storage = new DatabaseStorage();
