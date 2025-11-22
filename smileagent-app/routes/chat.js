const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { callClaude, getUsageStats } = require('../config/ai');
const { isAuthenticated } = require('../middleware/auth');

// GET Chat AI page
router.get('/chat', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;

  // Carica tutte le conversazioni
  const conversazioni = db.prepare(`
    SELECT c.*, COUNT(m.id) as num_messaggi
    FROM chat_conversazioni c
    LEFT JOIN chat_messaggi m ON c.id = m.conversazione_id
    WHERE c.studio_id = ?
    GROUP BY c.id
    ORDER BY c.ultima_attivita DESC
  `).all(studioId);

  res.render('pages/chat', {
    title: 'Chat AI - SmileAgent',
    studioNome: req.session.studioNome,
    conversazioni,
    currentConversazione: null,
    messaggi: []
  });
});

// GET Conversazione specifica
router.get('/chat/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const conversazioneId = req.params.id;

  const conversazione = db.prepare('SELECT * FROM chat_conversazioni WHERE id = ? AND studio_id = ?').get(conversazioneId, studioId);

  if (!conversazione) {
    return res.redirect('/chat');
  }

  const messaggi = db.prepare(`
    SELECT * FROM chat_messaggi
    WHERE conversazione_id = ?
    ORDER BY timestamp ASC
  `).all(conversazioneId);

  const conversazioni = db.prepare(`
    SELECT c.*, COUNT(m.id) as num_messaggi
    FROM chat_conversazioni c
    LEFT JOIN chat_messaggi m ON c.id = m.conversazione_id
    WHERE c.studio_id = ?
    GROUP BY c.id
    ORDER BY c.ultima_attivita DESC
  `).all(studioId);

  res.render('pages/chat', {
    title: `Chat AI - ${conversazione.titolo || 'Nuova conversazione'} - SmileAgent`,
    studioNome: req.session.studioNome,
    conversazioni,
    currentConversazione: conversazione,
    messaggi
  });
});

// POST Nuovo messaggio
router.post('/chat/:id/message', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const conversazioneId = req.params.id;
  const { message } = req.body;

  try {
    // Verifica che la conversazione appartenga allo studio
    const conversazione = db.prepare('SELECT * FROM chat_conversazioni WHERE id = ? AND studio_id = ?').get(conversazioneId, studioId);

    if (!conversazione) {
      return res.status(404).json({ error: 'Conversazione non trovata' });
    }

    // Salva messaggio utente
    const insertUserMsg = db.prepare(`
      INSERT INTO chat_messaggi (conversazione_id, ruolo, contenuto, timestamp)
      VALUES (?, 'user', ?, datetime('now'))
    `);
    insertUserMsg.run(conversazioneId, message);

    // Carica storico conversazione
    const history = db.prepare(`
      SELECT ruolo, contenuto FROM chat_messaggi
      WHERE conversazione_id = ?
      ORDER BY timestamp ASC
    `).all(conversazioneId);

    // Escludi l'ultimo messaggio (quello appena inserito) dallo storico per Claude
    const conversationHistory = history.slice(0, -1);

    // Chiama Claude
    const aiResponse = await callClaude(message, conversationHistory);

    if (!aiResponse.success) {
      return res.status(500).json({
        error: aiResponse.error,
        type: aiResponse.type
      });
    }

    // Salva risposta AI
    const insertAiMsg = db.prepare(`
      INSERT INTO chat_messaggi (conversazione_id, ruolo, contenuto, timestamp, tokens_usati)
      VALUES (?, 'assistant', ?, datetime('now'), ?)
    `);
    insertAiMsg.run(conversazioneId, aiResponse.content, aiResponse.tokensUsed);

    // Aggiorna ultima attività conversazione
    db.prepare('UPDATE chat_conversazioni SET ultima_attivita = datetime(\'now\') WHERE id = ?').run(conversazioneId);

    // Aggiorna titolo se è il primo scambio
    if (conversationHistory.length === 0 && !conversazione.titolo) {
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      db.prepare('UPDATE chat_conversazioni SET titolo = ? WHERE id = ?').run(title, conversazioneId);
    }

    res.json({
      success: true,
      message: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed
    });

  } catch (error) {
    console.error('Errore chat:', error);
    res.status(500).json({ error: 'Errore durante l\'elaborazione del messaggio' });
  }
});

// POST Nuova conversazione
router.post('/chat/new', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;

  const insert = db.prepare(`
    INSERT INTO chat_conversazioni (studio_id, tipo, data_creazione, ultima_attivita)
    VALUES (?, 'generale', datetime('now'), datetime('now'))
  `);

  const result = insert.run(studioId);
  res.redirect(`/chat/${result.lastInsertRowid}`);
});

// DELETE Conversazione
router.delete('/chat/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const conversazioneId = req.params.id;

  db.prepare('DELETE FROM chat_conversazioni WHERE id = ? AND studio_id = ?').run(conversazioneId, studioId);

  res.json({ success: true });
});

// GET API Usage Stats (per monitoraggio free tier)
router.get('/chat/api/usage-stats', isAuthenticated, (req, res) => {
  const stats = getUsageStats();
  res.json(stats);
});

module.exports = router;
