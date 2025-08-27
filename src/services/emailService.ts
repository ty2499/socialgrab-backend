import { storage } from "../storage";
import { EmailGateway, InsertEmailGateway } from "@shared/schema";
import { MailService } from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface SendGridConfig {
  apiKey: string;
  from: string;
}

class EmailService {
  private sendGridService?: MailService;
  
  /**
   * Initialize email service with the active gateway
   */
  async initialize(): Promise<void> {
    const activeGateway = await storage.getActiveEmailGateway();
    
    if (activeGateway?.provider === "sendgrid") {
      const config = activeGateway.config as SendGridConfig;
      this.sendGridService = new MailService();
      this.sendGridService.setApiKey(config.apiKey);
    }
  }
  
  /**
   * Send email using the configured gateway
   */
  async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      const activeGateway = await storage.getActiveEmailGateway();
      
      if (!activeGateway) {
        console.error("No active email gateway configured");
        return false;
      }
      
      switch (activeGateway.provider) {
        case "sendgrid":
          return await this.sendViaSendGrid(message, activeGateway.config as SendGridConfig);
        case "smtp":
          return await this.sendViaSMTP(message, activeGateway.config as SMTPConfig);
        default:
          console.error(`Unsupported email provider: ${activeGateway.provider}`);
          return false;
      }
    } catch (error) {
      console.error("Email sending error:", error);
      return false;
    }
  }
  
  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(message: EmailMessage, config: SendGridConfig): Promise<boolean> {
    try {
      if (!this.sendGridService) {
        this.sendGridService = new MailService();
        this.sendGridService.setApiKey(config.apiKey);
      }
      
      await this.sendGridService.send({
        to: message.to,
        from: message.from || config.from || "noreply@socialgrab.app",
        subject: message.subject,
        text: message.text || "",
        html: message.html,
      });
      
      return true;
    } catch (error) {
      console.error("SendGrid email error:", error);
      return false;
    }
  }
  
  /**
   * Send email via SMTP using nodemailer
   */
  private async sendViaSMTP(message: EmailMessage, config: SMTPConfig): Promise<boolean> {
    try {
      // Create reusable transporter object using the SMTP transport
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure, // true for 465, false for other ports
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
      });

      // Send mail with defined transport object
      const info = await transporter.sendMail({
        from: message.from || config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      console.log("SMTP email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("SMTP email error:", error);
      return false;
    }
  }
  
  /**
   * Test email gateway configuration
   */
  async testGateway(gatewayId: string, testEmail: string): Promise<boolean> {
    try {
      const gateway = await storage.getEmailGateway(gatewayId);
      if (!gateway) {
        return false;
      }
      
      const testMessage: EmailMessage = {
        to: testEmail,
        subject: "SocialGrab Email Gateway Test",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #E53E3E;">Email Gateway Test</h2>
            <p>This is a test email from SocialGrab to verify your email gateway configuration.</p>
            <p><strong>Gateway:</strong> ${gateway.name}</p>
            <p><strong>Provider:</strong> ${gateway.provider}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
            <p>If you're receiving this email, your gateway is working correctly!</p>
            <p>The SocialGrab Team</p>
          </div>
        `
      };
      
      const success = await this.sendEmail(testMessage);
      
      // Update test status in database
      await storage.updateEmailGatewayTestStatus(gatewayId, success ? "success" : "failed");
      
      return success;
    } catch (error) {
      console.error("Gateway test error:", error);
      return false;
    }
  }
  
  /**
   * Configure SendGrid gateway
   */
  async configureSendGrid(name: string, apiKey: string, fromEmail: string): Promise<EmailGateway> {
    const gatewayData: InsertEmailGateway = {
      name,
      provider: "sendgrid",
      config: {
        apiKey,
        from: fromEmail
      },
      isActive: false,
      isDefault: false
    };
    
    return await storage.createEmailGateway(gatewayData);
  }
  
  /**
   * Configure SMTP gateway
   */
  async configureSMTP(
    name: string,
    host: string,
    port: number,
    secure: boolean,
    user: string,
    password: string,
    fromEmail: string
  ): Promise<EmailGateway> {
    const gatewayData: InsertEmailGateway = {
      name,
      provider: "smtp",
      config: {
        host,
        port,
        secure,
        auth: {
          user,
          pass: password
        },
        from: fromEmail
      },
      isActive: false,
      isDefault: false
    };
    
    return await storage.createEmailGateway(gatewayData);
  }
}

export const emailService = new EmailService();