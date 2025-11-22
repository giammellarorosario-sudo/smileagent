/**
 * AI Auto-Reply Service
 * Automatic email responses powered by Gemini AI
 * @module services/ai-auto-reply
 */

const { callGemini } = require('../config/ai');
const GmailService = require('./gmail.service');
const CalendarService = require('./calendar.service');

// System prompt per auto-risposte email odontoiatriche
const EMAIL_REPLY_SYSTEM_PROMPT = `Sei l'assistente AI di uno studio dentistico italiano professionale.

Il tuo compito è rispondere alle email dei pazienti in modo:
- PROFESSIONALE ma CORDIALE
- EMPATICO e RASSICURANTE
- CHIARO e CONCISO
- UTILE e PRATICO

REGOLE FONDAMENTALI:
1. Usa sempre il "Lei" formale
2. Firma sempre come "SmileAgent - Assistente Virtuale"
3. NON dare diagnosi mediche o consigli clinici specifici
4. Per emergenze, invita SEMPRE a chiamare lo studio
5. Per domande cliniche complesse, invita a prenotare una visita
6. Tono caldo, professionale, mai robotico
7. Lunghezza: 3-5 paragrafi massimo
8. Se rilevi richiesta appuntamento, menziona che un operatore la ricontatterà

ESEMPI DI SITUAZIONI:
- Richiesta informazioni generali → Rispondi con info utili
- Richiesta appuntamento → Conferma ricezione, indica che verranno ricontattati
- Domanda clinica semplice → Rispondi con info generale, suggerisci visita
- Emergenza → Invita a chiamare immediatamente lo studio
- Domanda su costi → Spiega che dipende dalla visita, invita a prenotare consulenza

Genera email di risposta in italiano professionale.`;

class AIAutoReplyService {
  constructor() {
    this.gmailService = new GmailService();
    this.calendarService = new CalendarService();
  }

  /**
   * Imposta credenziali OAuth2 per Gmail e Calendar
   * @param {Object} tokens - OAuth2 tokens
   */
  setCredentials(tokens) {
    this.gmailService.setCredentials(tokens);
    this.calendarService.setCredentials(tokens);
  }

  /**
   * Analizza email e genera risposta AI
   * @param {Object} email - Email object from Gmail
   * @param {Object} context - Additional context (studio info, patient data)
   * @returns {Promise<Object>} AI reply result
   */
  async generateReply(email, context = {}) {
    try {
      // Analizza email per richiesta appuntamento
      const appointmentDetection = this.gmailService.detectAppointmentRequest(email.body);

      // Costruisci prompt per AI
      const emailContext = `
EMAIL RICEVUTA:
Da: ${email.from}
Oggetto: ${email.subject}
Messaggio:
${email.body}

CONTESTO STUDIO:
Studio: ${context.studioNome || 'Studio Dentistico'}
Email: ${context.studioEmail || 'smileagent.italia@gmail.com'}
Telefono: ${context.studioTelefono || 'Non disponibile'}

RILEVAMENTO APPUNTAMENTO:
${appointmentDetection.hasAppointment ? `
✅ Richiesta appuntamento rilevata (confidenza: ${(appointmentDetection.confidence * 100).toFixed(0)}%)
Data suggerita: ${appointmentDetection.suggestedDate || 'Non specificata'}
Ora suggerita: ${appointmentDetection.suggestedTime || 'Non specificata'}
` : '❌ Nessuna richiesta appuntamento rilevata'}

COMPITO:
Genera una risposta email professionale, empatica e utile.
${appointmentDetection.hasAppointment ? 'IMPORTANTE: Conferma che la richiesta di appuntamento è stata ricevuta e che un operatore ricontatterà a breve per confermare data/ora.' : ''}

Rispondi SOLO con il testo della email (senza oggetto, senza "Da:", senza "A:", solo il corpo del messaggio).
`;

      // Chiama AI
      const aiResponse = await callGemini(emailContext, [], EMAIL_REPLY_SYSTEM_PROMPT);

      if (!aiResponse.success) {
        return {
          success: false,
          error: 'AI generation failed',
          details: aiResponse.error
        };
      }

      // Pulisci risposta (rimuovi eventuali header se AI li ha inseriti)
      let replyBody = aiResponse.content.trim();

      // Rimuovi eventuali "Oggetto:" o "Subject:" che AI potrebbe aver aggiunto
      replyBody = replyBody.replace(/^(Oggetto|Subject):\s*.+\n\n?/i, '');

      return {
        success: true,
        replyBody: replyBody,
        hasAppointmentRequest: appointmentDetection.hasAppointment,
        appointmentData: appointmentDetection,
        tokensUsed: aiResponse.tokensUsed || 0,
        confidence: this.calculateReplyConfidence(email, replyBody, appointmentDetection)
      };

    } catch (error) {
      console.error('Error generating AI reply:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Invia risposta automatica
   * @param {Object} email - Original email
   * @param {String} replyBody - Reply message body
   * @param {Boolean} createCalendarEvent - Se creare evento calendario
   * @param {Object} appointmentData - Dati appuntamento (se rilevato)
   * @returns {Promise<Object>} Send result
   */
  async sendAutoReply(email, replyBody, createCalendarEvent = false, appointmentData = null) {
    try {
      // Prepara subject (Re: original subject)
      const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;

      // Estrai email mittente
      const toEmail = this.extractEmailAddress(email.from);

      if (!toEmail) {
        return {
          success: false,
          error: 'Could not extract recipient email'
        };
      }

      // Invia risposta
      const sendResult = await this.gmailService.sendReply(
        toEmail,
        subject,
        replyBody,
        email.threadId
      );

      if (!sendResult.success) {
        return sendResult;
      }

      // Marca originale come letta
      await this.gmailService.markAsRead(email.id);

      // Se richiesta appuntamento e dati disponibili, crea evento Calendar
      let calendarEvent = null;
      if (createCalendarEvent && appointmentData && appointmentData.suggestedDate) {
        calendarEvent = await this.createCalendarEventFromEmail(
          email,
          appointmentData
        );
      }

      return {
        success: true,
        messageId: sendResult.messageId,
        threadId: sendResult.threadId,
        calendarEvent: calendarEvent,
        replyBody: replyBody
      };

    } catch (error) {
      console.error('Error sending auto-reply:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crea evento calendario da email
   * @param {Object} email - Email object
   * @param {Object} appointmentData - Appointment detection data
   * @returns {Promise<Object>} Calendar event result
   */
  async createCalendarEventFromEmail(email, appointmentData) {
    try {
      // Estrai nome paziente (prima parola dell'email o from name)
      const fromName = email.from.split('<')[0].trim() || 'Paziente';
      const patientEmail = this.extractEmailAddress(email.from);

      // Converti data suggerita in ISO datetime
      // NOTA: Questo è semplificato - in produzione usare libreria date parsing
      const suggestedDateTime = this.parseDateTimeFromText(
        appointmentData.suggestedDate,
        appointmentData.suggestedTime
      );

      if (!suggestedDateTime) {
        return {
          success: false,
          error: 'Could not parse appointment date/time'
        };
      }

      // Crea evento
      const eventResult = await this.calendarService.createAppointment(
        patientEmail,
        fromName,
        suggestedDateTime,
        `Richiesta via email\n\nMessaggio originale:\n${email.body.substring(0, 200)}...`,
        60 // 60 minuti default
      );

      return eventResult;

    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Estrai indirizzo email da stringa "Nome <email@domain.com>"
   * @param {String} fromString - From header value
   * @returns {String|null} Email address
   */
  extractEmailAddress(fromString) {
    const match = fromString.match(/<(.+?)>/);
    if (match) {
      return match[1];
    }

    // Se non ha <>, assume sia solo email
    if (fromString.includes('@')) {
      return fromString.trim();
    }

    return null;
  }

  /**
   * Parse data/ora da testo italiano
   * @param {String} dateText - Testo data
   * @param {String} timeText - Testo ora
   * @returns {String|null} ISO datetime string
   */
  parseDateTimeFromText(dateText, timeText) {
    // SEMPLIFICATO - In produzione usare libreria robusta
    if (!dateText) return null;

    try {
      // Esempio: "15/03/2025" + "14:30" → "2025-03-15T14:30:00"
      const dateMatch = dateText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (!dateMatch) return null;

      let day = parseInt(dateMatch[1]);
      let month = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);

      // Fix anno corto
      if (year < 100) {
        year += 2000;
      }

      // Default ora: 10:00 se non specificata
      let hour = 10;
      let minute = 0;

      if (timeText) {
        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1]);
          minute = parseInt(timeMatch[2]);
        }
      }

      const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      return isoDate;

    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }

  /**
   * Calcola confidenza della risposta AI
   * @param {Object} email - Original email
   * @param {String} reply - AI reply
   * @param {Object} appointmentData - Appointment detection
   * @returns {Number} Confidence score 0-100
   */
  calculateReplyConfidence(email, reply, appointmentData) {
    let confidence = 70; // Base confidence

    // Boost se email è chiara
    if (email.body.length > 50 && email.body.length < 500) {
      confidence += 10;
    }

    // Boost se risposta è appropriata in lunghezza
    if (reply.length > 100 && reply.length < 800) {
      confidence += 10;
    }

    // Boost se appuntamento rilevato con alta confidenza
    if (appointmentData.hasAppointment && appointmentData.confidence > 0.7) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Verifica se email richiede risposta automatica
   * @param {Object} email - Email object
   * @returns {Boolean} Should auto-reply
   */
  shouldAutoReply(email) {
    // Non rispondere a:
    // - Email automatiche (no-reply, notifications, etc.)
    // - Email già risposte (thread con multiple risposte)
    // - Spam

    const from = email.from.toLowerCase();

    // Skip no-reply addresses
    if (from.includes('no-reply') || from.includes('noreply')) {
      return false;
    }

    // Skip automated systems
    if (from.includes('automated') || from.includes('notification')) {
      return false;
    }

    // Skip se subject contiene "out of office" o simili
    const subject = email.subject.toLowerCase();
    if (subject.includes('out of office') || subject.includes('auto-reply')) {
      return false;
    }

    // OK per auto-reply
    return true;
  }
}

module.exports = AIAutoReplyService;
