import nodemailer from 'nodemailer';
import { storage } from '../storage';
import { emailTemplateService } from './emailTemplateService';

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class SupabaseEmailService {
  private transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize the email service with SMTP configuration
   */
  async initialize(): Promise<void> {
    try {
      // For Supabase, we'll use SMTP configuration from environment or database
      const smtpConfig = await this.getSMTPConfig();
      
      if (smtpConfig) {
        this.transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.auth.user,
            pass: smtpConfig.auth.pass,
          },
        });

        // Verify the connection
        if (this.transporter) {
          await this.transporter.verify();
        }
        console.log('Email service initialized successfully');
      } else {
        console.warn('No SMTP configuration found');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  /**
   * Get SMTP configuration from environment or database
   */
  private async getSMTPConfig(): Promise<SMTPConfig | null> {
    try {
      // Try to get from database first
      const emailGateway = await storage.getActiveEmailGateway();
      
      if (emailGateway && emailGateway.provider === 'smtp') {
        return emailGateway.config as SMTPConfig;
      }

      // Fallback to environment variables for Supabase SMTP
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      return null;
    }
  }

  /**
   * Send email
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      if (!this.transporter) {
        await this.initialize();
        if (!this.transporter) {
          console.error('Email service not initialized');
          return false;
        }
      }

      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@socialgrab.app',
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    try {
      const html = await emailTemplateService.createWelcomeEmail(userName, userEmail);
      
      return await this.sendEmail({
        to: userEmail,
        subject: 'Welcome to SocialGrab - Start Downloading Videos!',
        html,
        text: `Welcome to SocialGrab, ${userName}! Start downloading videos from Facebook, TikTok, Pinterest, and Instagram.`
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<boolean> {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'https://socialgrab.app'}/reset-password?token=${resetToken}`;
      const html = await emailTemplateService.createPasswordResetEmail(userName, resetLink);
      
      return await this.sendEmail({
        to: userEmail,
        subject: 'Reset Your SocialGrab Password',
        html,
        text: `Reset your password: ${resetLink}`
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userEmail: string, userName: string, verificationCode: string): Promise<boolean> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'https://socialgrab.app'}/verify-email?code=${verificationCode}`;
      const html = await emailTemplateService.createVerificationEmail(userName, verificationCode, verificationLink);
      
      return await this.sendEmail({
        to: userEmail,
        subject: 'Verify Your SocialGrab Email Address',
        html,
        text: `Verify your email with code: ${verificationCode}`
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  /**
   * Send custom notification email
   */
  async sendNotificationEmail(userEmail: string, data: {
    userName: string;
    notificationTitle: string;
    notificationMessage: string;
    hasAction?: boolean;
    actionTitle?: string;
    actionDescription?: string;
    actionLink?: string;
    actionButtonText?: string;
    hasInfoSection?: boolean;
    infoTitle?: string;
    infoContent?: string;
    hasStats?: boolean;
    stats?: Array<{number: string, label: string}>;
    closingMessage?: string;
  }): Promise<boolean> {
    try {
      const html = await emailTemplateService.createNotificationEmail(data);
      
      return await this.sendEmail({
        to: userEmail,
        subject: `${data.notificationTitle} - SocialGrab`,
        html,
        text: `${data.notificationTitle}: ${data.notificationMessage}`
      });
    } catch (error) {
      console.error('Failed to send notification email:', error);
      return false;
    }
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(testEmail: string): Promise<boolean> {
    try {
      return await this.sendEmail({
        to: testEmail,
        subject: 'SocialGrab Email Test',
        html: '<h1>Email Configuration Test</h1><p>If you received this email, your email configuration is working correctly!</p>',
        text: 'Email Configuration Test - If you received this email, your email configuration is working correctly!'
      });
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }
}

export const supabaseEmailService = new SupabaseEmailService();