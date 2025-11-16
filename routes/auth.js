const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/database');
const { isGuest } = require('../middleware/auth');

// GET Login page
router.get('/login', isGuest, (req, res) => {
  res.render('pages/login', {
    error: req.query.error || null,
    title: 'Accedi - SmileAgent'
  });
});

// POST Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const studio = db.prepare('SELECT * FROM studios WHERE email = ? AND stato = ?').get(email, 'attivo');

    if (!studio) {
      return res.redirect('/login?error=credentials');
    }

    const passwordMatch = await bcrypt.compare(password, studio.password);

    if (!passwordMatch) {
      return res.redirect('/login?error=credentials');
    }

    // Aggiorna ultimo accesso
    db.prepare('UPDATE studios SET ultimo_accesso = CURRENT_TIMESTAMP WHERE id = ?').run(studio.id);

    // Crea sessione
    req.session.studioId = studio.id;
    req.session.studioNome = studio.nome;
    req.session.studioEmail = studio.email;

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Errore login:', error);
    res.redirect('/login?error=server');
  }
});

// GET Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Errore logout:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
