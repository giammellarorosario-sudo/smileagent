const { db } = require('../config/database');
const GmailService = require('./gmail.service');
const AIAutoReplyService = require('./ai-auto-reply.service');

class AutoReplyScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkIntervalMs = 60000; // 60 secondi
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Auto-reply scheduler already running');
      return;
    }

    console.log('🤖 Starting AI Auto-Reply Scheduler (checks every 60s)');
    this.isRunning = true;

    // Check immediately on start
    this.checkAndReply();

    // Then check every 60 seconds
    this.intervalId = setInterval(() => {
      this.checkAndReply();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('🛑 Auto-reply scheduler stopped');
    }
  }

  async checkAndReply() {
    try {
      console.log('🔍 Checking for new emails to auto-reply...');

      // Get all studios with Gmail connected
      const studios = db.prepare(`
        SELECT DISTINCT s.id, s.nome, s.email
        FROM studios s
        INNER JOIN oauth_tokens ot ON s.id = ot.studio_id
        WHERE ot.servizio = 'gmail' AND ot.attivo = 1
      `).all();

      for (const studio of studios) {
        await this.processStudioEmails(studio.id);
      }
    } catch (error) {
      console.error('❌ Error in auto-reply scheduler:', error);
    }
  }

  async processStudioEmails(studioId) {
    try {
      // Get Gmail tokens
      const gmailToken = db.prepare(`
        SELECT * FROM oauth_tokens
        WHERE studio_id = ? AND servizio = 'gmail' AND attivo = 1
      `).get(studioId);

      if (!gmailToken) return;

      // Initialize Gmail service
      const gmailService = new GmailService();
      gmailService.setCredentials({
        access_token: gmailToken.access_token,
        refresh_token: gmailToken.refresh_token,
        token_type: gmailToken.token_type,
        expiry_date: gmailToken.expiry_date,
        scope: gmailToken.scope
      });

      // Fetch latest emails
      const result = await gmailService.fetchEmails(10, 'in:inbox');

      if (!result.success || !result.emails || result.emails.length === 0) {
        console.log(`📭 No new emails for studio ${studioId}`);
        return;
      }

      const emails = result.emails;
      console.log(`📧 Found ${emails.length} emails for studio ${studioId}`);

      // Check each email
      for (const email of emails) {
        await this.processEmail(studioId, email, gmailService);
      }
    } catch (error) {
      console.error(`❌ Error processing studio ${studioId}:`, error);
    }
  }

  async processEmail(studioId, email, gmailService) {
    try {
      // Check if email already has AI reply OR has been attempted
      const existingThread = db.prepare(`
        SELECT * FROM email_threads
        WHERE studio_id = ? AND thread_id = ?
      `).get(studioId, email.id);

      if (existingThread && existingThread.ai_replied) {
        // Already replied or attempted
        return;
      }

      // Check if email should be auto-replied
      const aiAutoReplyService = new AIAutoReplyService();
      const shouldReply = aiAutoReplyService.shouldAutoReply(email);

      if (!shouldReply) {
        console.log(`⏭️ Skipping email ${email.id} (auto-reply not suitable)`);
        // Mark as processed to avoid retrying
        db.prepare(`
          INSERT OR REPLACE INTO email_threads (
            studio_id, thread_id, gmail_message_id, from_email, from_name,
            subject, last_message_date, ai_replied, data_creazione
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `).run(
          studioId,
          email.threadId || email.id,
          email.id,
          email.from,
          email.from.split('<')[0].trim(),
          email.subject,
          new Date().toISOString()
        );
        return;
      }

      console.log(`🤖 Auto-replying to email from ${email.from}...`);

      // Generate and send AI reply
      const context = {
        studioId,
        fromEmail: email.from,
        subject: email.subject,
        body: email.body
      };

      const aiResponse = await aiAutoReplyService.generateReply(email, context);

      // Check if AI generation failed (quota or other error)
      if (!aiResponse.success) {
        console.error(`⚠️ AI reply failed for ${email.from}: ${aiResponse.error || 'Unknown error'}`);
        // Mark as attempted to avoid retry loop
        db.prepare(`
          INSERT OR REPLACE INTO email_threads (
            studio_id, thread_id, gmail_message_id, from_email, from_name,
            subject, last_message_date, ai_replied, data_creazione
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `).run(
          studioId,
          email.threadId || email.id,
          email.id,
          email.from,
          email.from.split('<')[0].trim(),
          email.subject,
          new Date().toISOString()
        );
        return;
      }

      if (aiResponse.replyBody) {
        // Send the reply
        const sendResult = await aiAutoReplyService.sendAutoReply(
          email,
          aiResponse.replyBody,
          aiResponse.hasAppointmentRequest,
          aiResponse.appointmentData
        );

        if (sendResult.success) {
          console.log(`✅ Auto-reply sent to ${email.from}`);

          // Save to database
          db.prepare(`
            INSERT OR REPLACE INTO email_threads (
              studio_id, thread_id, gmail_message_id, from_email, from_name,
              subject, last_message_date, ai_replied, data_creazione
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
          `).run(
            studioId,
            email.threadId || email.id,
            email.id,
            email.from,
            email.from.split('<')[0].trim(),
            email.subject,
            new Date().toISOString()
          );
        }
      }
    } catch (error) {
      // Check if it's a quota error
      if (error.message && error.message.includes('quota')) {
        console.error(`⚠️ Gemini API quota exceeded - marking email as attempted to avoid retry loop`);
        // Mark as attempted to avoid infinite retry
        db.prepare(`
          INSERT OR REPLACE INTO email_threads (
            studio_id, thread_id, gmail_message_id, from_email, from_name,
            subject, last_message_date, ai_replied, data_creazione
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `).run(
          studioId,
          email.threadId || email.id,
          email.id,
          email.from,
          email.from.split('<')[0].trim(),
          email.subject,
          new Date().toISOString()
        );
      }
      console.error(`❌ Error auto-replying to email ${email.id}:`, error.message);
    }
  }
}

// Singleton instance
const autoReplyScheduler = new AutoReplyScheduler();

module.exports = autoReplyScheduler;
