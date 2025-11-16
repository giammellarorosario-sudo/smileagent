const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Dashboard principale
router.get('/dashboard', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;

  // Stats per dashboard
  const totalPazienti = db.prepare('SELECT COUNT(*) as count FROM pazienti WHERE studio_id = ?').get(studioId).count;
  const appuntamentiOggi = db.prepare(`
    SELECT COUNT(*) as count FROM appuntamenti
    WHERE studio_id = ? AND DATE(data_ora) = DATE('now')
  `).get(studioId).count;

  const appuntamentiSettimana = db.prepare(`
    SELECT COUNT(*) as count FROM appuntamenti
    WHERE studio_id = ? AND DATE(data_ora) BETWEEN DATE('now') AND DATE('now', '+7 days')
  `).get(studioId).count;

  const fattureNonPagate = db.prepare(`
    SELECT COUNT(*) as count, IFNULL(SUM(totale), 0) as importo
    FROM fatture WHERE studio_id = ? AND stato = 'da_pagare'
  `).get(studioId);

  // Prossimi appuntamenti
  const prossimiAppuntamenti = db.prepare(`
    SELECT a.*, p.nome, p.cognome, p.telefono, t.nome as dentista_nome, t.cognome as dentista_cognome
    FROM appuntamenti a
    JOIN pazienti p ON a.paziente_id = p.id
    LEFT JOIN team_members t ON a.dentista_id = t.id
    WHERE a.studio_id = ? AND a.data_ora >= datetime('now')
    ORDER BY a.data_ora ASC
    LIMIT 10
  `).all(studioId);

  // Ultimi pazienti
  const ultimiPazienti = db.prepare(`
    SELECT * FROM pazienti
    WHERE studio_id = ?
    ORDER BY data_creazione DESC
    LIMIT 5
  `).all(studioId);

  res.render('pages/dashboard', {
    title: 'Dashboard - SmileAgent',
    studioNome: req.session.studioNome,
    stats: {
      totalPazienti,
      appuntamentiOggi,
      appuntamentiSettimana,
      fattureNonPagate: fattureNonPagate.count,
      importoNonPagato: fattureNonPagate.importo
    },
    prossimiAppuntamenti,
    ultimiPazienti
  });
});

module.exports = router;
