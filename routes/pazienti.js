const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// GET /pazienti - Lista pazienti
router.get('/pazienti', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { search = '' } = req.query;

  try {
    let pazienti;

    if (search) {
      pazienti = db.prepare(`
        SELECT * FROM pazienti
        WHERE studio_id = ?
          AND (
            nome LIKE ? OR
            cognome LIKE ? OR
            email LIKE ? OR
            telefono LIKE ?
          )
        ORDER BY cognome, nome
      `).all(studioId, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    } else {
      pazienti = db.prepare(`
        SELECT * FROM pazienti
        WHERE studio_id = ?
        ORDER BY cognome, nome
      `).all(studioId);
    }

    // Statistiche
    const stats = db.prepare(`
      SELECT
        COUNT(*) as totale,
        SUM(CASE WHEN stato = 'attivo' THEN 1 ELSE 0 END) as attivi,
        SUM(CASE WHEN data_ultima_visita IS NOT NULL THEN 1 ELSE 0 END) as con_visite
      FROM pazienti
      WHERE studio_id = ?
    `).get(studioId);

    res.render('pages/pazienti', {
      currentPage: 'pazienti',
      studioNome: req.session.studioNome,
      pazienti,
      stats,
      search
    });

  } catch (error) {
    console.error('Errore caricamento pazienti:', error);
    res.status(500).send('Errore del server');
  }
});

// GET /pazienti/:id - Dettaglio paziente
router.get('/pazienti/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { id } = req.params;

  try {
    const paziente = db.prepare(`
      SELECT * FROM pazienti
      WHERE id = ? AND studio_id = ?
    `).get(id, studioId);

    if (!paziente) {
      return res.status(404).send('Paziente non trovato');
    }

    // Appuntamenti
    const appuntamenti = db.prepare(`
      SELECT a.*, t.nome as dentista_nome, t.cognome as dentista_cognome
      FROM appuntamenti a
      LEFT JOIN team_members t ON a.dentista_id = t.id
      WHERE a.paziente_id = ? AND a.studio_id = ?
      ORDER BY a.data_ora DESC
      LIMIT 10
    `).all(id, studioId);

    // Trattamenti
    const trattamenti = db.prepare(`
      SELECT t.*, tm.nome as dentista_nome, tm.cognome as dentista_cognome
      FROM trattamenti t
      LEFT JOIN team_members tm ON t.dentista_id = tm.id
      WHERE t.paziente_id = ? AND t.studio_id = ?
      ORDER BY t.data_esecuzione DESC
    `).all(id, studioId);

    // Analisi
    const analisi = db.prepare(`
      SELECT * FROM analisi_radiografiche
      WHERE paziente_id = ? AND studio_id = ?
      ORDER BY data_creazione DESC
      LIMIT 5
    `).all(id, studioId);

    res.render('pages/paziente-detail', {
      currentPage: 'pazienti',
      studioNome: req.session.studioNome,
      paziente,
      appuntamenti,
      trattamenti,
      analisi
    });

  } catch (error) {
    console.error('Errore caricamento paziente:', error);
    res.status(500).send('Errore del server');
  }
});

// POST /pazienti/nuovo - Crea nuovo paziente
router.post('/pazienti/nuovo', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { nome, cognome, data_nascita, sesso, telefono, email, indirizzo, citta, cap, codice_fiscale, note } = req.body;

  try {
    if (!nome || !cognome) {
      return res.status(400).json({ error: 'Nome e cognome sono obbligatori' });
    }

    const insert = db.prepare(`
      INSERT INTO pazienti (
        studio_id, nome, cognome, data_nascita, sesso, telefono, email,
        indirizzo, citta, cap, codice_fiscale, note, stato, data_registrazione
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'attivo', datetime('now'))
    `);

    const result = insert.run(
      studioId, nome, cognome, data_nascita || null, sesso || null,
      telefono || null, email || null, indirizzo || null, citta || null,
      cap || null, codice_fiscale || null, note || null
    );

    res.json({
      success: true,
      pazienteId: result.lastInsertRowid,
      message: 'Paziente creato con successo'
    });

  } catch (error) {
    console.error('Errore creazione paziente:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// PUT /pazienti/:id - Aggiorna paziente
router.put('/pazienti/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { id } = req.params;
  const { nome, cognome, data_nascita, sesso, telefono, email, indirizzo, citta, cap, codice_fiscale, note, stato } = req.body;

  try {
    const update = db.prepare(`
      UPDATE pazienti
      SET nome = ?, cognome = ?, data_nascita = ?, sesso = ?, telefono = ?,
          email = ?, indirizzo = ?, citta = ?, cap = ?, codice_fiscale = ?, note = ?, stato = ?
      WHERE id = ? AND studio_id = ?
    `);

    const result = update.run(
      nome, cognome, data_nascita, sesso, telefono, email, indirizzo,
      citta, cap, codice_fiscale, note, stato || 'attivo', id, studioId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Paziente non trovato' });
    }

    res.json({ success: true, message: 'Paziente aggiornato' });

  } catch (error) {
    console.error('Errore aggiornamento paziente:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// DELETE /pazienti/:id - Elimina paziente
router.delete('/pazienti/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { id } = req.params;

  try {
    // Invece di eliminare, imposta come inattivo
    const update = db.prepare(`
      UPDATE pazienti
      SET stato = 'inattivo'
      WHERE id = ? AND studio_id = ?
    `);

    const result = update.run(id, studioId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Paziente non trovato' });
    }

    res.json({ success: true, message: 'Paziente archiviato' });

  } catch (error) {
    console.error('Errore eliminazione paziente:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;
