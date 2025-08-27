import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { storage } from "../storage";
import { emailService } from "../services/emailService";
import { 
  PremiumUser, 
  InsertPremiumUser, 
  OtpVerification, 
  InsertOtpVerification,
  SubscriptionPlan 
} from "@shared/schema";

interface PurchaseData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  country?: string;
  planId: string;
  paymentMethodId: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: PremiumUser;
}

interface VerificationResponse {
  success: boolean;
  message: string;
}

class PremiumUserService {
  /**
   * Create a premium account with OTP verification
   */
  async createPremiumAccount(purchaseData: PurchaseData): Promise<VerificationResponse> {
    try {
      // Check if user already exists
      const existingUser = await storage.getPremiumUserByEmail(purchaseData.email);
      if (existingUser) {
        return {
          success: false,
          message: "An account with this email already exists"
        };
      }

      // Verify the subscription plan exists
      const plan = await storage.getSubscriptionPlan(purchaseData.planId);
      if (!plan) {
        return {
          success: false,
          message: "Invalid subscription plan selected"
        };
      }

      // Generate auto password for account
      const autoPassword = nanoid(12);
      const hashedPassword = await bcrypt.hash(autoPassword, 12);
      
      // Create premium user (unverified initially)
      const premiumUserData: InsertPremiumUser = {
        firstName: purchaseData.firstName,
        lastName: purchaseData.lastName,
        email: purchaseData.email,
        password: hashedPassword,
        planId: purchaseData.planId,
      };

      const premiumUser = await storage.createPremiumUser(premiumUserData);

      // Generate and send OTP
      await this.sendVerificationOTP(purchaseData.email, "account_verification");

      return {
        success: true,
        message: "Account created successfully. Please check your email for verification code."
      };
    } catch (error) {
      console.error("Premium account creation error:", error);
      return {
        success: false,
        message: "Failed to create account. Please try again."
      };
    }
  }

  /**
   * Verify premium account with OTP
   */
  async verifyPremiumAccount(email: string, otpCode: string): Promise<VerificationResponse> {
    try {
      // Verify OTP
      const otpVerification = await storage.getOtpVerification(email, otpCode, "account_verification");
      
      if (!otpVerification) {
        return {
          success: false,
          message: "Invalid or expired verification code"
        };
      }

      // Check if OTP is expired (10 minutes)  
      const isExpired = otpVerification.createdAt && Date.now() - new Date(otpVerification.createdAt).getTime() > 10 * 60 * 1000;
      if (isExpired) {
        return {
          success: false,
          message: "Verification code has expired. Please request a new one."
        };
      }

      if (otpVerification.isUsed) {
        return {
          success: false,
          message: "Verification code has already been used"
        };
      }

      // Mark OTP as used
      await storage.markOtpAsUsed(otpVerification.id);

      // Activate premium user account
      const premiumUser = await storage.getPremiumUserByEmail(email);
      if (!premiumUser) {
        return {
          success: false,
          message: "Premium account not found"
        };
      }

      await storage.updatePremiumUser(premiumUser.id, {
        isVerified: true
      });

      return {
        success: true,
        message: "Account verified successfully! You can now log in."
      };
    } catch (error) {
      console.error("Premium account verification error:", error);
      return {
        success: false,
        message: "Verification failed. Please try again."
      };
    }
  }

  /**
   * Authenticate premium user login
   */
  async authenticatePremiumUser(email: string, password: string): Promise<LoginResponse> {
    try {
      const premiumUser = await storage.getPremiumUserByEmail(email);
      
      if (!premiumUser) {
        return {
          success: false,
          message: "Invalid email or password"
        };
      }

      if (!premiumUser.isVerified) {
        return {
          success: false,
          message: "Please verify your account first. Check your email for verification code."
        };
      }


      // Verify password
      const isPasswordValid = await bcrypt.compare(password, premiumUser.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: "Invalid email or password"
        };
      }


      // Return user without password
      const { password: _, ...userWithoutPassword } = premiumUser;

      return {
        success: true,
        message: "Login successful",
        user: userWithoutPassword as PremiumUser
      };
    } catch (error) {
      console.error("Premium user authentication error:", error);
      return {
        success: false,
        message: "Authentication failed. Please try again."
      };
    }
  }

  /**
   * Resend OTP verification
   */
  async resendOtpVerification(email: string): Promise<VerificationResponse> {
    try {
      // Check if user exists
      const premiumUser = await storage.getPremiumUserByEmail(email);
      
      if (!premiumUser) {
        return {
          success: false,
          message: "No account found with this email address"
        };
      }

      if (premiumUser.isVerified) {
        return {
          success: false,
          message: "Account is already verified"
        };
      }

      // Send new OTP
      await this.sendVerificationOTP(email, "account_verification");

      return {
        success: true,
        message: "New verification code sent to your email"
      };
    } catch (error) {
      console.error("Resend OTP error:", error);
      return {
        success: false,
        message: "Failed to resend verification code"
      };
    }
  }

  /**
   * Send verification OTP via email
   */
  private async sendVerificationOTP(email: string, purpose: string): Promise<void> {
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    const otpData: InsertOtpVerification = {
      userId: '', // Will be updated by storage layer
      email,
      otpCode,
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      purpose
    };

    await storage.createOtpVerification(otpData);

    // Send email
    const emailSent = await emailService.sendEmail({
      to: email,
      subject: "SocialGrab - Account Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Account Verification Required</h2>
          <p>Thank you for creating your SocialGrab premium account!</p>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #dc2626; margin: 0; font-size: 32px; letter-spacing: 4px;">${otpCode}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <p>Best regards,<br>The SocialGrab Team</p>
        </div>
      `,
      text: `Your SocialGrab verification code is: ${otpCode}. This code will expire in 10 minutes.`
    });

    if (!emailSent) {
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Send account creation email with login details
   */
  async sendAccountCreationEmail(email: string, name: string, planId: string): Promise<void> {
    try {
      // Get plan details
      const plan = await storage.getSubscriptionPlan(planId);
      const planName = plan?.name || "Premium Plan";
      
      // Generate a temporary password that user should change
      const tempPassword = nanoid(12);
      
      // Get the user to update password
      const premiumUser = await storage.getPremiumUserByEmail(email);
      if (premiumUser) {
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        await storage.updatePremiumUser(premiumUser.id, {
          password: hashedPassword,
          isVerified: true
        });
      }
      
      // Send welcome email with login details
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "🎉 Welcome to SocialGrab Premium - Your Account is Ready!",
        html: this.createWelcomeEmailTemplate(name, email, tempPassword, planName),
        text: `Welcome to SocialGrab Premium! Your account has been created with email: ${email} and temporary password: ${tempPassword}. Plan: ${planName}. Please log in and change your password.`
      });

      if (!emailSent) {
        throw new Error("Failed to send account creation email");
      }
      
      console.log(`Account creation email sent to: ${email}`);
    } catch (error) {
      console.error("Send account creation email error:", error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<boolean> {
    try {
      // Generate reset token (in a real app, store this in database)
      const resetToken = nanoid(32);
      const resetLink = `${process.env.REPLIT_DEV_DOMAIN || 'https://yourdomain.com'}/reset-password?token=${resetToken}`;
      
      // For now, just send the email (you'd normally store the token in the database)
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "🔐 Reset Your SocialGrab Password",
        html: this.createPasswordResetEmailTemplate(email, resetLink),
        text: `Reset your SocialGrab password by clicking this link: ${resetLink}. This link expires in 1 hour.`
      });

      return emailSent;
    } catch (error) {
      console.error("Send password reset email error:", error);
      return false;
    }
  }

  /**
   * Create welcome email template
   */
  private createWelcomeEmailTemplate(name: string, email: string, tempPassword: string, planName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SocialGrab Premium</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 40px 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 28px; margin: 0; font-weight: bold;">🎉 Welcome to SocialGrab Premium!</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="font-family: Arial, sans-serif; color: #374151; line-height: 1.6;">
                      <p style="font-size: 18px; margin: 0 0 20px;">Hi ${name},</p>
                      
                      <p style="font-size: 16px; margin: 0 0 30px;">
                        Congratulations! Your premium account has been successfully created and activated. 
                        You now have access to all the powerful features that make SocialGrab the best video downloading platform.
                      </p>
                      
                      <!-- Login Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 30px;">
                            <h3 style="color: #dc2626; font-size: 18px; margin: 0 0 20px; font-family: Arial, sans-serif;">🔑 Your Login Details</h3>
                            <p style="margin: 0 0 10px; font-size: 16px;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 0 0 10px; font-size: 16px;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
                            <p style="margin: 0; font-size: 16px;"><strong>Plan:</strong> ${planName}</p>
                            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin-top: 20px;">
                              <p style="margin: 0; color: #92400e; font-size: 14px;">
                                ⚠️ <strong>Important:</strong> Please change your password after logging in for security.
                              </p>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Features List -->
                      <h3 style="color: #dc2626; font-size: 18px; margin: 30px 0 20px;">✨ Your Premium Features</h3>
                      <ul style="margin: 0 0 30px; padding-left: 20px;">
                        <li style="margin-bottom: 10px; font-size: 16px;">🎥 <strong>4K & High Quality Downloads</strong> - Get videos in the best available quality</li>
                        <li style="margin-bottom: 10px; font-size: 16px;">⚡ <strong>Faster Download Speeds</strong> - Priority processing for your downloads</li>
                        <li style="margin-bottom: 10px; font-size: 16px;">🚫 <strong>Ad-Free Experience</strong> - Enjoy SocialGrab without interruptions</li>
                        <li style="margin-bottom: 10px; font-size: 16px;">💬 <strong>Priority Support</strong> - Get help faster when you need it</li>
                        <li style="margin-bottom: 10px; font-size: 16px;">📱 <strong>Mobile App Access</strong> - Use our premium mobile app</li>
                      </ul>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${process.env.REPLIT_DEV_DOMAIN || 'https://yourdomain.com'}/login" style="background: linear-gradient(135deg, #dc2626, #ef4444); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; font-family: Arial, sans-serif;">
                              🚀 Access Your Premium Account
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="font-size: 16px; margin: 30px 0 0;">
                        Thank you for choosing SocialGrab Premium! We're excited to have you on board.
                      </p>
                      
                      <p style="font-size: 16px; margin: 20px 0 0;">
                        Best regards,<br>
                        <strong>The SocialGrab Team</strong>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f3f4f6; padding: 20px; text-align: center;">
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #6b7280;">
                      Questions? Reply to this email or contact us at support@socialgrab.app
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Create password reset email template  
   */
  private createPasswordResetEmailTemplate(email: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your SocialGrab Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 40px 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; font-family: Arial, sans-serif; font-size: 28px; margin: 0; font-weight: bold;">🔐 Password Reset</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <div style="font-family: Arial, sans-serif; color: #374151; line-height: 1.6;">
                      <p style="font-size: 18px; margin: 0 0 20px;">Hello,</p>
                      
                      <p style="font-size: 16px; margin: 0 0 30px;">
                        We received a request to reset the password for your SocialGrab account associated with <strong>${email}</strong>.
                      </p>
                      
                      <p style="font-size: 16px; margin: 0 0 30px;">
                        If you requested this password reset, click the button below to set a new password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetLink}" style="background: linear-gradient(135deg, #dc2626, #ef4444); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; font-family: Arial, sans-serif;">
                              🔑 Reset My Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Security Notice -->
                      <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 6px; margin: 30px 0;">
                        <h3 style="color: #92400e; margin: 0 0 15px; font-size: 16px;">⏱️ Important Security Information</h3>
                        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                          <li style="margin-bottom: 8px; font-size: 14px;">This reset link expires in <strong>1 hour</strong> for security</li>
                          <li style="margin-bottom: 8px; font-size: 14px;">If you didn't request this reset, you can safely ignore this email</li>
                          <li style="margin-bottom: 0; font-size: 14px;">Your account remains secure and no changes have been made</li>
                        </ul>
                      </div>
                      
                      <p style="font-size: 14px; margin: 30px 0 0; color: #6b7280;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
                      </p>
                      
                      <p style="font-size: 16px; margin: 30px 0 0;">
                        Best regards,<br>
                        <strong>The SocialGrab Team</strong>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f3f4f6; padding: 20px; text-align: center;">
                    <p style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; color: #6b7280;">
                      Questions? Reply to this email or contact us at support@socialgrab.app
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Get premium user features based on their plan
   */
  async getUserFeatures(userId: string): Promise<{
    maxVideoQuality: string;
    removeAds: boolean;
    features: string[];
  }> {
    try {
      const premiumUser = await storage.getPremiumUser(userId);
      
      if (!premiumUser) {
        // Return default features for non-premium users
        return {
          maxVideoQuality: "medium",
          removeAds: false,
          features: []
        };
      }

      const plan = await storage.getSubscriptionPlan(premiumUser.planId);
      
      if (!plan) {
        return {
          maxVideoQuality: "medium",
          removeAds: false,
          features: []
        };
      }

      return {
        maxVideoQuality: plan.maxVideoQuality,
        removeAds: Boolean(plan.removeAds),
        features: Array.isArray(plan.features) ? plan.features : []
      };
    } catch (error) {
      console.error("Get user features error:", error);
      return {
        maxVideoQuality: "medium",
        removeAds: false,
        features: []
      };
    }
  }

  /**
   * Check if user has premium access
   */
  async isPremiumUser(userId: string): Promise<boolean> {
    try {
      const premiumUser = await storage.getPremiumUser(userId);
      return premiumUser?.isVerified || false;
    } catch (error) {
      console.error("Check premium user error:", error);
      return false;
    }
  }
}

export const premiumUserService = new PremiumUserService();