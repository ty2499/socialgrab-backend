import fs from 'fs/promises';
import path from 'path';

interface TemplateVariables {
  [key: string]: any;
}

export class EmailTemplateService {
  private templatesDir = path.join(process.cwd(), 'server/templates');

  /**
   * Compile an email template with variables
   */
  async compileTemplate(templateName: string, variables: TemplateVariables): Promise<string> {
    try {
      // Read the base template
      const baseTemplate = await this.readTemplate('email-base.html');
      
      // Read the content template
      const contentTemplate = await this.readTemplate(`${templateName}.html`);
      
      // Replace variables in content
      const compiledContent = this.replaceVariables(contentTemplate, variables);
      
      // Replace content in base template
      const finalHtml = baseTemplate.replace('{{content}}', compiledContent);
      
      // Replace any remaining variables in the final template
      return this.replaceVariables(finalHtml, {
        title: variables.title || 'SocialGrab',
        unsubscribe_url: variables.unsubscribe_url || 'https://socialgrab.app/unsubscribe',
        ...variables
      });
    } catch (error) {
      console.error(`Error compiling template ${templateName}:`, error);
      throw new Error(`Failed to compile email template: ${templateName}`);
    }
  }

  /**
   * Read a template file
   */
  private async readTemplate(filename: string): Promise<string> {
    const filePath = path.join(this.templatesDir, filename);
    return await fs.readFile(filePath, 'utf-8');
  }

  /**
   * Replace variables in template using simple string replacement
   */
  private replaceVariables(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Simple variable replacement {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }
    
    // Handle conditional blocks {{#if condition}} ... {{/if}}
    result = this.handleConditionals(result, variables);
    
    // Handle loops {{#each array}} ... {{/each}}
    result = this.handleLoops(result, variables);
    
    // Clean up any remaining unmatched variables
    result = result.replace(/{{[^}]+}}/g, '');
    
    return result;
  }

  /**
   * Handle conditional blocks in templates
   */
  private handleConditionals(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Match {{#if condition}} content {{/if}} blocks
    const conditionalRegex = /{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g;
    
    result = result.replace(conditionalRegex, (match, condition, content) => {
      const conditionValue = variables[condition.trim()];
      return conditionValue ? content : '';
    });
    
    return result;
  }

  /**
   * Handle loop blocks in templates  
   */
  private handleLoops(template: string, variables: TemplateVariables): string {
    let result = template;
    
    // Match {{#each arrayName}} content {{/each}} blocks
    const loopRegex = /{{#each\s+([^}]+)}}([\s\S]*?){{\/each}}/g;
    
    result = result.replace(loopRegex, (match, arrayName, content) => {
      const array = variables[arrayName.trim()];
      if (!Array.isArray(array)) return '';
      
      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace item properties {{property}}
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            itemContent = itemContent.replace(regex, String(value || ''));
          }
        }
        
        // Replace {{this}} with the item itself (for primitive arrays)
        itemContent = itemContent.replace(/{{this}}/g, String(item));
        
        // Replace {{@index}} with the current index
        itemContent = itemContent.replace(/{{@index}}/g, String(index));
        
        return itemContent;
      }).join('');
    });
    
    return result;
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html') && file !== 'email-base.html')
        .map(file => file.replace('.html', ''));
    } catch (error) {
      console.error('Error reading templates directory:', error);
      return [];
    }
  }

  /**
   * Create welcome email
   */
  async createWelcomeEmail(userName: string, userEmail: string): Promise<string> {
    return this.compileTemplate('welcome-email', {
      title: 'Welcome to SocialGrab!',
      user_name: userName,
      user_email: userEmail
    });
  }

  /**
   * Create password reset email
   */
  async createPasswordResetEmail(userName: string, resetLink: string): Promise<string> {
    return this.compileTemplate('password-reset-email', {
      title: 'Reset Your Password - SocialGrab',
      user_name: userName,
      reset_link: resetLink
    });
  }

  /**
   * Create verification email
   */
  async createVerificationEmail(userName: string, verificationCode: string, verificationLink: string): Promise<string> {
    return this.compileTemplate('verification-email', {
      title: 'Verify Your Email - SocialGrab',
      user_name: userName,
      verification_code: verificationCode,
      verification_link: verificationLink
    });
  }

  /**
   * Create custom notification email
   */
  async createNotificationEmail(data: {
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
  }): Promise<string> {
    return this.compileTemplate('notification-email', {
      title: `${data.notificationTitle} - SocialGrab`,
      user_name: data.userName,
      notification_title: data.notificationTitle,
      notification_message: data.notificationMessage,
      has_action: data.hasAction,
      action_title: data.actionTitle,
      action_description: data.actionDescription,
      action_link: data.actionLink,
      action_button_text: data.actionButtonText,
      has_info_section: data.hasInfoSection,
      info_title: data.infoTitle,
      info_content: data.infoContent,
      has_stats: data.hasStats,
      stats: data.stats,
      closing_message: data.closingMessage || 'Thank you for using SocialGrab!'
    });
  }
}

export const emailTemplateService = new EmailTemplateService();