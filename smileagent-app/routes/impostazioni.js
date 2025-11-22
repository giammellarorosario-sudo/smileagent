const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

router.get('/impostazioni', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;

  try {
    const studio = db.prepare('SELECT * FROM studios WHERE id = ?').get(studioId);

    res.render('pages/impostazioni', {
      currentPage: 'impostazioni',
      studioNome: req.session.studioNome,
      studio
    });
  } catch (error) {
    console.error('Errore impostazioni:', error);
    res.status(500).send('Errore del server');
  }
});

router.post('/impostazioni/update', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { nome, telefono, indirizzo, citta, cap } = req.body;

  try {
    db.prepare(`
      UPDATE studios
      SET nome = ?, telefono = ?, indirizzo = ?, citta = ?, cap = ?
      WHERE id = ?
    `).run(nome, telefono, indirizzo, citta, cap, studioId);

    req.session.studioNome = nome;
    res.json({ success: true, message: 'Impostazioni aggiornate' });
  } catch (error) {
    console.error('Errore aggiornamento:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;
