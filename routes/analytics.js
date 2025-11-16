const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/analytics', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;

  try {
    // Statistiche generali
    const stats = {
      pazienti: db.prepare('SELECT COUNT(*) as count FROM pazienti WHERE studio_id = ?').get(studioId)?.count || 0,
      appuntamenti: db.prepare("SELECT COUNT(*) as count FROM appuntamenti WHERE studio_id = ? AND date(data_ora) >= date('now')").get(studioId)?.count || 0,
      analisi: db.prepare('SELECT COUNT(*) as count FROM analisi_radiografiche WHERE studio_id = ?').get(studioId)?.count || 0,
      conversazioni: db.prepare('SELECT COUNT(*) as count FROM chat_conversazioni WHERE studio_id = ?').get(studioId)?.count || 0
    };

    res.render('pages/analytics', {
      currentPage: 'analytics',
      studioNome: req.session.studioNome,
      stats
    });
  } catch (error) {
    console.error('Errore analytics:', error);
    res.status(500).send('Errore del server');
  }
});

module.exports = router;
