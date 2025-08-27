#!/usr/bin/env tsx
import { emailService } from "./services/emailService";
import { storage } from "./storage";

/**
 * Configure SMTP email gateway with the provided credentials
 * Username: support@socialgrab.app
 * Outgoing server: mail.spacemail.com:465
 * Incoming server: mail.spacemail.com:995
 * Password: Kundakinde001!
 */
async function configureSMTPGateway() {
  try {
    console.log("Configuring SMTP email gateway...");
    
    // Check if gateway already exists
    const existingGateways = await storage.getEmailGateways();
    let gateway = existingGateways.find(g => g.name === "SocialGrab SMTP");
    
    if (gateway) {
      console.log("SMTP gateway already exists, using existing gateway:", gateway.id);
    } else {
      // Create new SMTP gateway configuration
      gateway = await emailService.configureSMTP(
        "SocialGrab SMTP",
        "mail.spacemail.com",
        465,
        true, // secure connection for port 465
        "support@socialgrab.app",
        "Kundakinde001!",
        "support@socialgrab.app"
      );
      console.log("SMTP gateway created:", gateway);
    }
    
    // Deactivate all other gateways first
    for (const existingGateway of existingGateways) {
      if (existingGateway.id !== gateway.id && existingGateway.isActive) {
        await storage.updateEmailGateway(existingGateway.id, {
          isActive: false,
          isDefault: false
        });
      }
    }
    
    // Activate the SMTP gateway
    await storage.updateEmailGateway(gateway.id, {
      isActive: true,
      isDefault: true
    });
    
    console.log("SMTP gateway activated and set as default");
    
    // Initialize the email service
    await emailService.initialize();
    
    console.log("Email service initialized successfully");
    
    // Test the gateway
    console.log("Testing SMTP gateway...");
    const testResult = await emailService.testGateway(gateway.id, "support@socialgrab.app");
    
    if (testResult) {
      console.log("✅ SMTP gateway test successful!");
    } else {
      console.log("❌ SMTP gateway test failed");
    }
    
  } catch (error) {
    console.error("Error configuring SMTP gateway:", error);
    process.exit(1);
  }
}

// Run the configuration if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  configureSMTPGateway()
    .then(() => {
      console.log("SMTP configuration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Configuration failed:", error);
      process.exit(1);
    });
}

export { configureSMTPGateway };