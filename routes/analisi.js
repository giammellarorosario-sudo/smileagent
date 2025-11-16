const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { db } = require('../config/database');
const { analyzeRadiografia, generateDentalImage } = require('../config/ai');
const { isAuthenticated } = require('../middleware/auth');

// Configurazione Multer per upload immagini
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/radiografie');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `radiografia-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 4 // Max 4 immagini
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Solo immagini JPG, PNG o WebP sono permesse'));
    }
  }
});

// ============================================
// 🛡️ PROTEZIONE LIMITE 1 ANALISI/GIORNO
// ============================================

async function checkDailyLimit(studioId) {
  // 🔓 LIMITE DISABILITATO PER FASE TEST
  return {
    allowed: true,
    remaining: 999,
    resetTime: null,
    unlimited: true
  };

  /* IMPLEMENTAZIONE ORIGINALE CON LIMITE 1/GIORNO
  const oggi = new Date().toISOString().split('T')[0];

  try {
    const quota = db.prepare(`
      SELECT contatore FROM quota_usage
      WHERE studio_id = ? AND tipo_risorsa = 'analisi_radiografica' AND data_uso = ?
    `).get(studioId, oggi);

    if (quota && quota.contatore >= 1) {
      return { allowed: false, remaining: 0, resetTime: new Date(oggi + 'T23:59:59').toISOString() };
    }

    return { allowed: true, remaining: 1 - (quota ? quota.contatore : 0), resetTime: new Date(oggi + 'T23:59:59').toISOString() };
  } catch (error) {
    console.error('Errore check quota:', error);
    return { allowed: true, remaining: 1 };
  }
  */
}

async function incrementDailyUsage(studioId) {
  const oggi = new Date().toISOString().split('T')[0];

  try {
    db.prepare(`
      INSERT INTO quota_usage (studio_id, tipo_risorsa, data_uso, contatore, ultima_richiesta)
      VALUES (?, 'analisi_radiografica', ?, 1, datetime('now'))
      ON CONFLICT(studio_id, tipo_risorsa, data_uso)
      DO UPDATE SET
        contatore = contatore + 1,
        ultima_richiesta = datetime('now')
    `).run(studioId, oggi);
  } catch (error) {
    console.error('Errore incremento quota:', error);
  }
}

// ============================================
// ROUTES
// ============================================

// GET Pagina Analisi Radiografie
router.get('/analisi', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  try {
    // Carica storico analisi
    const analisi = db.prepare(`
      SELECT
        ar.*,
        p.nome as paziente_nome,
        p.cognome as paziente_cognome,
        COUNT(ai.id) as num_immagini
      FROM analisi_radiografiche ar
      LEFT JOIN pazienti p ON ar.paziente_id = p.id
      LEFT JOIN analisi_immagini ai ON ar.id = ai.analisi_id
      WHERE ar.studio_id = ?
      GROUP BY ar.id
      ORDER BY ar.data_creazione DESC
      LIMIT 50
    `).all(studioId);

    // Check limite giornaliero
    const limitCheck = await checkDailyLimit(studioId);

    res.render('pages/analisi', {
      title: 'Analisi Radiografie - SmileAgent',
      studioNome: req.session.studioNome,
      currentPage: 'analisi',
      analisi: analisi,
      quotaInfo: limitCheck
    });

  } catch (error) {
    console.error('Errore caricamento analisi:', error);
    res.status(500).send('Errore caricamento pagina');
  }
});

// POST Nuova Analisi con Upload
router.post('/analisi/nuova', isAuthenticated, upload.array('immagini', 4), async (req, res) => {
  const studioId = req.session.studioId;
  const { paziente_id, note } = req.body;

  try {
    // 🔓 LIMITE RIMOSSO PER FASE TEST
    // const limitCheck = await checkDailyLimit(studioId);
    // if (!limitCheck.allowed) { ... }

    // Verifica che ci siano file
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Nessuna immagine caricata',
        message: 'Carica almeno 1 immagine (max 4)'
      });
    }

    // Crea record analisi
    const insertAnalisi = db.prepare(`
      INSERT INTO analisi_radiografiche (
        studio_id, paziente_id, stato, note, data_creazione
      ) VALUES (?, ?, 'in_elaborazione', ?, datetime('now'))
    `);

    const analisiResult = insertAnalisi.run(
      studioId,
      paziente_id || null,
      note || null
    );

    const analisiId = analisiResult.lastInsertRowid;

    // Salva riferimenti immagini nel DB
    const insertImmagine = db.prepare(`
      INSERT INTO analisi_immagini (
        analisi_id, tipo_immagine, file_path, file_name, file_size, mime_type, ordine
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    req.files.forEach((file, index) => {
      // Converti path assoluto in relativo per web
      const relativePath = file.path.replace(/\\/g, '/').replace(/.*uploads\//, 'uploads/');

      insertImmagine.run(
        analisiId,
        file.fieldname,
        relativePath, // Path relativo invece di assoluto
        file.filename,
        file.size,
        file.mimetype,
        index
      );
    });

    // Esegui analisi con Gemini Vision
    const imagePaths = req.files.map(f => f.path);
    const testoAggiuntivo = note || '';

    const analisiResponse = await analyzeRadiografia(imagePaths, testoAggiuntivo);

    if (!analisiResponse.success) {
      // Aggiorna stato a errore
      db.prepare(`
        UPDATE analisi_radiografiche
        SET stato = 'errore', note = ?
        WHERE id = ?
      `).run(analisiResponse.error, analisiId);

      return res.status(500).json({
        error: 'Errore analisi',
        message: analisiResponse.error
      });
    }

    // Genera immagine 2D (placeholder per ora)
    const imageGenResponse = await generateDentalImage(analisiResponse.analisi);

    // Aggiorna record con risultati
    db.prepare(`
      UPDATE analisi_radiografiche
      SET
        stato = 'completata',
        report_json = ?,
        immagine_2d_url = ?,
        score_salute = ?,
        problemi_rilevati = ?,
        trattamenti_suggeriti = ?,
        data_completamento = datetime('now'),
        tokens_vision_usati = ?,
        immagini_generate = ?
      WHERE id = ?
    `).run(
      JSON.stringify(analisiResponse.analisi),
      imageGenResponse.imageUrl || null,
      analisiResponse.analisi.scoreGenerale || null,
      JSON.stringify(analisiResponse.analisi.problemiRilevati || []),
      JSON.stringify(analisiResponse.analisi.trattamentiSuggeriti || []),
      analisiResponse.tokensUsed || 0,
      imageGenResponse.success ? 1 : 0,
      analisiId
    );

    // 🔓 CONTATORE DISABILITATO PER FASE TEST
    // await incrementDailyUsage(studioId);

    res.json({
      success: true,
      analisiId: analisiId,
      analisi: analisiResponse.analisi,
      immagine2D: imageGenResponse.imageUrl,
      message: 'Analisi completata con successo',
      quotaRemaining: 999 // Illimitato in fase test
    });

  } catch (error) {
    console.error('Errore creazione analisi:', error);

    // Cleanup file in caso di errore
    if (req.files) {
      await Promise.all(req.files.map(f => fs.unlink(f.path).catch(() => {})));
    }

    res.status(500).json({
      error: 'Errore server',
      message: 'Errore durante l\'elaborazione dell\'analisi'
    });
  }
});

// GET Dettaglio Analisi
router.get('/analisi/:id', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const analisiId = req.params.id;

  try {
    // Carica analisi
    const analisi = db.prepare(`
      SELECT
        ar.*,
        p.nome as paziente_nome,
        p.cognome as paziente_cognome
      FROM analisi_radiografiche ar
      LEFT JOIN pazienti p ON ar.paziente_id = p.id
      WHERE ar.id = ? AND ar.studio_id = ?
    `).get(analisiId, studioId);

    if (!analisi) {
      return res.status(404).send('Analisi non trovata');
    }

    // Carica immagini
    const immagini = db.prepare(`
      SELECT * FROM analisi_immagini
      WHERE analisi_id = ?
      ORDER BY ordine
    `).all(analisiId);

    // Parse JSON
    if (analisi.report_json) {
      analisi.reportData = JSON.parse(analisi.report_json);
    }
    if (analisi.problemi_rilevati) {
      analisi.problemiArray = JSON.parse(analisi.problemi_rilevati);
    }
    if (analisi.trattamenti_suggeriti) {
      analisi.trattamentiArray = JSON.parse(analisi.trattamenti_suggeriti);
    }

    res.render('pages/analisi-detail', {
      title: `Analisi #${analisiId} - SmileAgent`,
      studioNome: req.session.studioNome,
      currentPage: 'analisi',
      analisi: analisi,
      immagini: immagini
    });

  } catch (error) {
    console.error('Errore caricamento dettaglio:', error);
    res.status(500).send('Errore caricamento analisi');
  }
});

// DELETE Elimina Analisi
router.delete('/analisi/:id', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const analisiId = req.params.id;

  try {
    // Carica immagini per eliminarle da disco
    const immagini = db.prepare(`
      SELECT ai.* FROM analisi_immagini ai
      JOIN analisi_radiografiche ar ON ai.analisi_id = ar.id
      WHERE ar.id = ? AND ar.studio_id = ?
    `).all(analisiId, studioId);

    // Elimina file da disco
    await Promise.all(
      immagini.map(img => fs.unlink(img.file_path).catch(() => {}))
    );

    // Elimina da DB (cascade eliminerà anche immagini)
    db.prepare(`
      DELETE FROM analisi_radiografiche
      WHERE id = ? AND studio_id = ?
    `).run(analisiId, studioId);

    res.json({ success: true });

  } catch (error) {
    console.error('Errore eliminazione analisi:', error);
    res.status(500).json({ error: 'Errore eliminazione' });
  }
});

// GET Check Quota
router.get('/analisi/quota/check', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  const limitCheck = await checkDailyLimit(studioId);
  res.json(limitCheck);
});

module.exports = router;
