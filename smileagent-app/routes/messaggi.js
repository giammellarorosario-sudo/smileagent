const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { db } = require('../config/database');
const GmailService = require('../services/gmail.service');
const CalendarService = require('../services/calendar.service');
const AIAutoReplyService = require('../services/ai-auto-reply.service');

// ============================================
// GET Pagina Messaggi
// ============================================
router.get('/messaggi', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  try {
    // Verifica se Gmail è connesso
    const gmailToken = db.prepare(`
      SELECT * FROM oauth_tokens
      WHERE studio_id = ? AND servizio = 'gmail' AND attivo = 1
    `).get(studioId);

    // Carica email threads salvati
    const emailThreads = db.prepare(`
      SELECT * FROM email_threads
      WHERE studio_id = ?
      ORDER BY last_message_date DESC
      LIMIT 50
    `).all(studioId);

    res.render('pages/messaggi', {
      currentPage: 'messaggi',
      studioNome: req.session.studioNome,
      gmailConnected: !!gmailToken,
      emailThreads: emailThreads
    });

  } catch (error) {
    console.error('Error loading messaggi page:', error);
    res.status(500).send('Errore caricamento pagina');
  }
});

// ============================================
// GET Gmail OAuth URL
// ============================================
router.get('/api/messaggi/gmail/auth-url', isAuthenticated, (req, res) => {
  const gmailService = new GmailService();
  const authUrl = gmailService.getAuthUrl();

  res.json({
    success: true,
    authUrl: authUrl
  });
});

// ============================================
// GET Gmail OAuth Callback
// ============================================
router.get('/auth/gmail/callback', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { code } = req.query;

  if (!code) {
    return res.redirect('/messaggi?error=no_code');
  }

  try {
    const gmailService = new GmailService();
    const result = await gmailService.setCredentialsFromCode(code);

    if (!result.success) {
      return res.redirect('/messaggi?error=auth_failed');
    }

    // Salva tokens nel database
    const saveToken = db.prepare(`
      INSERT OR REPLACE INTO oauth_tokens
      (studio_id, servizio, access_token, refresh_token, token_type, expiry_date, scope)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    saveToken.run(
      studioId,
      'gmail',
      result.tokens.access_token,
      result.tokens.refresh_token || null,
      result.tokens.token_type || 'Bearer',
      result.tokens.expiry_date || null,
      result.tokens.scope || 'gmail'
    );

    res.redirect('/messaggi?success=gmail_connected');

  } catch (error) {
    console.error('Error in Gmail callback:', error);
    res.redirect('/messaggi?error=callback_failed');
  }
});

// ============================================
// POST Sync Gmail Emails
// ============================================
router.post('/api/messaggi/gmail/sync', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  try {
    // Recupera token Gmail
    const gmailToken = db.prepare(`
      SELECT * FROM oauth_tokens
      WHERE studio_id = ? AND servizio = 'gmail' AND attivo = 1
    `).get(studioId);

    if (!gmailToken) {
      return res.status(401).json({
        success: false,
        error: 'Gmail not connected'
      });
    }

    // Inizializza Gmail Service
    const gmailService = new GmailService();
    gmailService.setCredentials({
      access_token: gmailToken.access_token,
      refresh_token: gmailToken.refresh_token,
      token_type: gmailToken.token_type,
      expiry_date: gmailToken.expiry_date
    });

    // Fetch emails
    const maxResults = req.body.maxResults || 20;
    const emailsResult = await gmailService.fetchEmails(maxResults, 'in:inbox');

    if (!emailsResult.success) {
      return res.status(500).json(emailsResult);
    }

    // Salva threads nel database
    const insertThread = db.prepare(`
      INSERT OR REPLACE INTO email_threads
      (studio_id, thread_id, gmail_message_id, from_email, from_name, subject, last_message_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    emailsResult.emails.forEach(email => {
      const fromEmail = gmailService.constructor.prototype.extractEmailAddress
        ? email.from
        : email.from.match(/<(.+?)>/) ? email.from.match(/<(.+?)>/)[1] : email.from;

      insertThread.run(
        studioId,
        email.threadId,
        email.id,
        fromEmail,
        email.from.split('<')[0].trim(),
        email.subject,
        email.date
      );
    });

    res.json({
      success: true,
      emails: emailsResult.emails,
      count: emailsResult.count,
      synced: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error syncing Gmail:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST AI Auto-Reply
// ============================================
router.post('/api/messaggi/gmail/auto-reply', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { emailId, threadId } = req.body;

  try {
    // Recupera token Gmail
    const gmailToken = db.prepare(`
      SELECT * FROM oauth_tokens
      WHERE studio_id = ? AND servizio = 'gmail' AND attivo = 1
    `).get(studioId);

    if (!gmailToken) {
      return res.status(401).json({
        success: false,
        error: 'Gmail not connected'
      });
    }

    // Recupera info studio
    const studio = db.prepare('SELECT * FROM studios WHERE id = ?').get(studioId);

    // Inizializza AI Auto-Reply Service
    const aiReplyService = new AIAutoReplyService();
    aiReplyService.setCredentials({
      access_token: gmailToken.access_token,
      refresh_token: gmailToken.refresh_token,
      token_type: gmailToken.token_type,
      expiry_date: gmailToken.expiry_date
    });

    // Fetch email details
    const gmailService = aiReplyService.gmailService;
    const emailsResult = await gmailService.fetchEmails(50);

    if (!emailsResult.success) {
      return res.status(500).json(emailsResult);
    }

    const email = emailsResult.emails.find(e => e.id === emailId);

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Genera risposta AI
    const replyResult = await aiReplyService.generateReply(email, {
      studioNome: studio.nome,
      studioEmail: studio.email,
      studioTelefono: studio.telefono
    });

    if (!replyResult.success) {
      return res.status(500).json(replyResult);
    }

    // Invia risposta
    const sendResult = await aiReplyService.sendAutoReply(
      email,
      replyResult.replyBody,
      replyResult.hasAppointmentRequest,
      replyResult.appointmentData
    );

    if (!sendResult.success) {
      return res.status(500).json(sendResult);
    }

    // Aggiorna thread nel database
    db.prepare(`
      UPDATE email_threads
      SET ai_replied = 1,
          appointment_created = ?,
          calendar_event_id = ?
      WHERE studio_id = ? AND thread_id = ?
    `).run(
      sendResult.calendarEvent?.success ? 1 : 0,
      sendResult.calendarEvent?.eventId || null,
      studioId,
      threadId
    );

    res.json({
      success: true,
      reply: sendResult,
      aiConfidence: replyResult.confidence,
      hasAppointment: replyResult.hasAppointmentRequest
    });

  } catch (error) {
    console.error('Error sending auto-reply:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST Toggle AI Auto-Reply Mode
// ============================================
router.post('/api/messaggi/ai/toggle', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { enabled } = req.body;

  try {
    // Salva preferenza AI nel database (o in sessione)
    // Per ora salviamo in una nuova colonna studios
    // In produzione: creare tabella settings

    res.json({
      success: true,
      aiEnabled: enabled,
      message: enabled ? 'AI Auto-Reply attivato' : 'AI Auto-Reply disattivato'
    });

  } catch (error) {
    console.error('Error toggling AI mode:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// ============================================
// GET Gmail Thread Details
// ============================================
router.get('/api/messaggi/gmail/thread/:threadId', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { threadId } = req.params;

  try {
    const gmailToken = db.prepare('SELECT * FROM oauth_tokens WHERE studio_id = ? AND servizio = ? AND attivo = 1').get(studioId, 'gmail');

    if (!gmailToken) {
      return res.status(401).json({ success: false, error: 'Gmail non connesso' });
    }

    const thread = db.prepare('SELECT * FROM email_threads WHERE thread_id = ? AND studio_id = ?').get(threadId, studioId);

    if (!thread) {
      return res.status(404).json({ success: false, error: 'Thread non trovato' });
    }

    const messages = [{
      from: thread.from_email,
      from_name: thread.from_name,
      subject: thread.subject,
      body: thread.snippet || '(Contenuto email)',
      date: thread.last_message_date,
      isFromUser: true
    }];

    res.json({ success: true, messages, thread });

  } catch (error) {
    console.error('Error loading Gmail thread:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// POST Send Gmail Reply
// ============================================
router.post('/api/messaggi/gmail/send', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { to, subject, body, threadId } = req.body;

  try {
    if (!to || !body) {
      return res.status(400).json({ success: false, error: 'Destinatario e corpo richiesti' });
    }

    const gmailToken = db.prepare('SELECT * FROM oauth_tokens WHERE studio_id = ? AND servizio = ? AND attivo = 1').get(studioId, 'gmail');

    if (!gmailToken) {
      return res.status(401).json({ success: false, error: 'Gmail non connesso' });
    }

    const gmailService = new GmailService();
    gmailService.setCredentials({
      access_token: gmailToken.access_token,
      refresh_token: gmailToken.refresh_token,
      token_type: gmailToken.token_type,
      expiry_date: gmailToken.expiry_date,
      scope: gmailToken.scope
    });

    const result = await gmailService.sendReply(to, subject, body, threadId);

    if (result.success) {
      if (threadId) {
        db.prepare('UPDATE email_threads SET ai_replied = 1, data_aggiornamento = datetime(?) WHERE thread_id = ? AND studio_id = ?').run('now', threadId, studioId);
      }

      res.json({ success: true, messageId: result.messageId, threadId: result.threadId });
    } else {
      res.status(500).json({ success: false, error: result.error || 'Errore invio' });
    }

  } catch (error) {
    console.error('Error sending Gmail reply:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
