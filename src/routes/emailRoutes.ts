import express from 'express';
import { storage } from '../storage';
import { supabaseEmailService } from '../services/supabaseEmailService';
import { emailTemplateService } from '../services/emailTemplateService';

const router = express.Router();

// Send email endpoint
router.post('/send-email', async (req, res) => {
  try {
    const { to, subject, templateType, customMessage, userName } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient email and subject are required' });
    }

    let success = false;

    switch (templateType) {
      case 'welcome':
        success = await supabaseEmailService.sendWelcomeEmail(to, userName || 'User');
        break;
      case 'password-reset':
        // Generate a mock reset token for demo
        const resetToken = Math.random().toString(36).substring(2, 15);
        success = await supabaseEmailService.sendPasswordResetEmail(to, userName || 'User', resetToken);
        break;
      case 'verification':
        // Generate a verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        success = await supabaseEmailService.sendVerificationEmail(to, userName || 'User', verificationCode);
        break;
      case 'notification':
      default:
        success = await supabaseEmailService.sendNotificationEmail(to, {
          userName: userName || 'User',
          notificationTitle: subject,
          notificationMessage: customMessage || 'This is a custom notification from SocialGrab.',
          hasAction: false,
          closingMessage: 'Thank you for using SocialGrab!'
        });
        break;
    }

    if (success) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    const success = await supabaseEmailService.testEmailConfiguration(testEmail);

    if (success) {
      res.json({ success: true, message: 'Test email sent successfully' });
    } else {
      res.status(500).json({ error: 'Test email failed' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get email templates
router.get('/email-templates', async (req, res) => {
  try {
    // Temporary fallback until email template storage is implemented
    const templates: any[] = [];
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Save email template
router.post('/email-templates', async (req, res) => {
  try {
    const { name, subject, template, type } = req.body;

    if (!name || !subject || !template || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const templateData = {
      name,
      subject,
      template,
      type,
      isActive: true
    };

    // Temporary fallback until email template storage is implemented
    const result = { id: 'temp-' + Date.now().toString(), ...templateData };
    res.json({ success: true, template: result });
  } catch (error) {
    console.error('Save template error:', error);
    res.status(500).json({ error: 'Failed to save email template' });
  }
});

// Get email configuration
router.get('/email-config', async (req, res) => {
  try {
    const config = await storage.getActiveEmailGateway();
    res.json(config);
  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({ error: 'Failed to fetch email configuration' });
  }
});

// Save email configuration
router.post('/email-config', async (req, res) => {
  try {
    const { name, provider, config, isActive } = req.body;

    if (!name || !provider || !config) {
      return res.status(400).json({ error: 'Name, provider and config are required' });
    }

    const gatewayData = {
      name,
      provider,
      config,
      isActive: isActive !== false,
      isDefault: true
    };

    const result = await storage.createEmailGateway(gatewayData);
    
    // Reinitialize email service with new config
    await supabaseEmailService.initialize();
    
    res.json({ success: true, gateway: result });
  } catch (error) {
    console.error('Save email config error:', error);
    res.status(500).json({ error: 'Failed to save email configuration' });
  }
});

// Get available email template types
router.get('/template-types', async (req, res) => {
  try {
    const types = await emailTemplateService.getAvailableTemplates();
    res.json(types);
  } catch (error) {
    console.error('Get template types error:', error);
    res.status(500).json({ error: 'Failed to fetch template types' });
  }
});

export default router;