/**
 * Gmail Service
 * Handles Gmail API operations for SmileAgent
 * @module services/gmail
 */

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

// OAuth2 Configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/gmail/callback';

// Gmail Account
const GMAIL_ACCOUNT = 'smileagent.italia@gmail.com';

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI
    );

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.isAuthenticated = false;
  }

  /**
   * Genera URL di autenticazione OAuth2
   * @returns {String} Authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    // DEBUG: Log redirect URI
    console.log('🔍 GMAIL REDIRECT_URI CONFIGURED:', GMAIL_REDIRECT_URI);
    console.log('🔗 Generated Auth URL:', authUrl);

    return authUrl;
  }

  /**
   * Imposta credenziali OAuth2 da authorization code
   * @param {String} code - Authorization code from OAuth2 flow
   * @returns {Promise<Object>} Tokens
   */
  async setCredentialsFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;

      return {
        success: true,
        tokens: tokens,
        expiresAt: new Date(Date.now() + tokens.expiry_date)
      };
    } catch (error) {
      console.error('Error setting credentials:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Imposta credenziali da tokens salvati
   * @param {Object} tokens - Saved OAuth2 tokens
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
    this.isAuthenticated = true;
  }

  /**
   * Fetch email da Gmail inbox
   * @param {Number} maxResults - Max emails to fetch (default: 20)
   * @param {String} query - Gmail search query (default: 'is:unread')
   * @returns {Promise<Array>} List of emails
   */
  async fetchEmails(maxResults = 20, query = 'in:inbox') {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Gmail not authenticated'
        };
      }

      // Lista messaggi
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: maxResults,
        q: query
      });

      const messages = response.data.messages || [];

      if (messages.length === 0) {
        return {
          success: true,
          emails: [],
          count: 0
        };
      }

      // Fetch dettagli per ogni messaggio
      const emailPromises = messages.map(async (msg) => {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        return this.parseEmailData(detail.data);
      });

      const emails = await Promise.all(emailPromises);

      return {
        success: true,
        emails: emails,
        count: emails.length
      };

    } catch (error) {
      console.error('Error fetching emails:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse email data in formato consistente
   * @param {Object} rawEmail - Raw Gmail API email object
   * @returns {Object} Parsed email
   */
  parseEmailData(rawEmail) {
    const headers = rawEmail.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Estrai body
    let body = '';
    if (rawEmail.payload.body && rawEmail.payload.body.data) {
      body = Buffer.from(rawEmail.payload.body.data, 'base64').toString('utf-8');
    } else if (rawEmail.payload.parts) {
      const textPart = rawEmail.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      id: rawEmail.id,
      threadId: rawEmail.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      body: body,
      snippet: rawEmail.snippet,
      labelIds: rawEmail.labelIds || [],
      isUnread: rawEmail.labelIds.includes('UNREAD')
    };
  }

  /**
   * Invia risposta email
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} body - Email body (plain text)
   * @param {String} threadId - Thread ID per risposte (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendReply(to, subject, body, threadId = null) {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Gmail not authenticated'
        };
      }

      // Costruisci email in formato RFC 2822
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].join('\n');

      // Encode in base64
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Invia email
      const sendOptions = {
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      };

      if (threadId) {
        sendOptions.requestBody.threadId = threadId;
      }

      const response = await this.gmail.users.messages.send(sendOptions);

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      };

    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Marca email come letta
   * @param {String} messageId - Message ID
   * @returns {Promise<Object>} Result
   */
  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analizza email per richieste appuntamento
   * @param {String} emailBody - Email body text
   * @returns {Object} Appointment detection result
   */
  detectAppointmentRequest(emailBody) {
    const text = emailBody.toLowerCase();

    // Keywords appuntamento
    const appointmentKeywords = [
      'appuntamento',
      'prenotare',
      'prenotazione',
      'vorrei venire',
      'disponibilità',
      'quando posso',
      'visita',
      'consulenza'
    ];

    const hasAppointmentRequest = appointmentKeywords.some(keyword =>
      text.includes(keyword)
    );

    if (!hasAppointmentRequest) {
      return {
        hasAppointment: false,
        confidence: 0
      };
    }

    // Cerca data/ora
    const datePatterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, // 15/03/2025 or 15-03-2025
      /\b(lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\b/gi,
      /\b(domani|dopodomani|prossima settimana)\b/gi
    ];

    const timePatterns = [
      /\b(\d{1,2}):(\d{2})\b/g, // 14:30
      /\b(\d{1,2})\s?(am|pm)\b/gi, // 2pm
      /\b(mattina|pomeriggio|sera)\b/gi
    ];

    let foundDate = null;
    let foundTime = null;

    datePatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match && !foundDate) {
        foundDate = match[0];
      }
    });

    timePatterns.forEach(pattern => {
      const match = text.match(pattern);
      if (match && !foundTime) {
        foundTime = match[0];
      }
    });

    const confidence = (hasAppointmentRequest ? 0.4 : 0) +
                      (foundDate ? 0.3 : 0) +
                      (foundTime ? 0.3 : 0);

    return {
      hasAppointment: true,
      confidence: confidence,
      suggestedDate: foundDate,
      suggestedTime: foundTime,
      rawText: emailBody.substring(0, 200) // Prime 200 char per context
    };
  }
}

module.exports = GmailService;
