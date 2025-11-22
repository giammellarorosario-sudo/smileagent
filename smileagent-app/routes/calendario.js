const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// GET /calendario - Vista calendario
router.get('/calendario', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { view = 'month', date } = req.query;

  try {
    // Data di riferimento (oggi o data specifica)
    const targetDate = date ? new Date(date) : new Date();
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    // Calcola range date per la vista
    let startDate, endDate;

    if (view === 'day') {
      startDate = new Date(year, month, targetDate.getDate());
      endDate = new Date(year, month, targetDate.getDate() + 1);
    } else if (view === 'week') {
      const dayOfWeek = targetDate.getDay();
      startDate = new Date(targetDate);
      startDate.setDate(targetDate.getDate() - dayOfWeek + 1); // Lunedì
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else { // month
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0);
    }

    // Recupera appuntamenti del periodo
    const appuntamenti = db.prepare(`
      SELECT
        a.*,
        p.nome as paziente_nome,
        p.cognome as paziente_cognome,
        p.telefono as paziente_telefono,
        t.nome as dentista_nome,
        t.cognome as dentista_cognome
      FROM appuntamenti a
      LEFT JOIN pazienti p ON a.paziente_id = p.id
      LEFT JOIN team_members t ON a.dentista_id = t.id
      WHERE a.studio_id = ?
        AND date(a.data_ora) >= date(?)
        AND date(a.data_ora) <= date(?)
      ORDER BY a.data_ora ASC
    `).all(studioId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

    // Recupera pazienti per nuovo appuntamento
    const pazienti = db.prepare(`
      SELECT id, nome, cognome, telefono
      FROM pazienti
      WHERE studio_id = ?
      ORDER BY cognome, nome
    `).all(studioId);

    // Recupera team members
    const teamMembers = db.prepare(`
      SELECT id, nome, cognome, ruolo
      FROM team_members
      WHERE studio_id = ? AND attivo = 1
      ORDER BY nome, cognome
    `).all(studioId);

    // Statistiche giornata
    const oggi = new Date().toISOString().split('T')[0];
    const statsOggi = db.prepare(`
      SELECT
        COUNT(*) as totale,
        SUM(CASE WHEN stato = 'confermato' THEN 1 ELSE 0 END) as confermati,
        SUM(CASE WHEN stato = 'completato' THEN 1 ELSE 0 END) as completati,
        SUM(CASE WHEN stato = 'cancellato' THEN 1 ELSE 0 END) as cancellati
      FROM appuntamenti
      WHERE studio_id = ? AND date(data_ora) = date(?)
    `).get(studioId, oggi);

    res.render('pages/calendario', {
      currentPage: 'calendario',
      studioNome: req.session.studioNome,
      appuntamenti,
      pazienti,
      teamMembers,
      view,
      targetDate: targetDate.toISOString().split('T')[0],
      statsOggi
    });

  } catch (error) {
    console.error('Errore caricamento calendario:', error);
    res.status(500).send('Errore del server');
  }
});

// POST /calendario/nuovo - Crea nuovo appuntamento
router.post('/calendario/nuovo', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { paziente_id, dentista_id, data_ora, durata_minuti, tipo_trattamento, note } = req.body;

  try {
    if (!paziente_id || !data_ora) {
      return res.status(400).json({ error: 'Paziente e data/ora sono obbligatori' });
    }

    const insert = db.prepare(`
      INSERT INTO appuntamenti (
        studio_id, paziente_id, dentista_id, data_ora, durata_minuti,
        tipo_trattamento, stato, note
      ) VALUES (?, ?, ?, ?, ?, ?, 'confermato', ?)
    `);

    const result = insert.run(
      studioId,
      paziente_id,
      dentista_id || null,
      data_ora,
      durata_minuti || 30,
      tipo_trattamento || null,
      note || null
    );

    res.json({
      success: true,
      appuntamentoId: result.lastInsertRowid,
      message: 'Appuntamento creato con successo'
    });

  } catch (error) {
    console.error('Errore creazione appuntamento:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// PUT /calendario/:id - Aggiorna appuntamento
router.put('/calendario/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { id } = req.params;
  const { data_ora, durata_minuti, tipo_trattamento, stato, note, dentista_id } = req.body;

  try {
    const update = db.prepare(`
      UPDATE appuntamenti
      SET data_ora = ?, durata_minuti = ?, tipo_trattamento = ?,
          stato = ?, note = ?, dentista_id = ?
      WHERE id = ? AND studio_id = ?
    `);

    const result = update.run(
      data_ora,
      durata_minuti || 30,
      tipo_trattamento,
      stato || 'confermato',
      note,
      dentista_id || null,
      id,
      studioId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appuntamento non trovato' });
    }

    res.json({ success: true, message: 'Appuntamento aggiornato' });

  } catch (error) {
    console.error('Errore aggiornamento appuntamento:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

// DELETE /calendario/:id - Elimina/Cancella appuntamento
router.delete('/calendario/:id', isAuthenticated, (req, res) => {
  const studioId = req.session.studioId;
  const { id } = req.params;

  try {
    // Invece di eliminare, imposta come cancellato
    const update = db.prepare(`
      UPDATE appuntamenti
      SET stato = 'cancellato'
      WHERE id = ? AND studio_id = ?
    `);

    const result = update.run(id, studioId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Appuntamento non trovato' });
    }

    res.json({ success: true, message: 'Appuntamento cancellato' });

  } catch (error) {
    console.error('Errore cancellazione appuntamento:', error);
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;
