const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { db } = require('../config/database');
const { generateInstagramPost } = require('../config/ai');

// ============================================
// GET Pagina Social Media
// ============================================
router.get('/social', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  try {
    // Carica post salvati
    const posts = db.prepare(`
      SELECT * FROM social_posts
      WHERE studio_id = ?
      ORDER BY id DESC
      LIMIT 50
    `).all(studioId);

    res.render('pages/social', {
      currentPage: 'social',
      studioNome: req.session.studioNome,
      posts: posts
    });
  } catch (error) {
    console.error('Errore caricamento social:', error);
    res.status(500).send('Errore caricamento pagina');
  }
});

// ============================================
// POST Genera Post Instagram (AI)
// ============================================
router.post('/api/social/generate', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { topic, style, tone } = req.body;

  try {
    console.log(`📸 Generazione post Instagram: topic="${topic}", style="${style}"`);

    // Valida input
    if (!topic || topic.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Topic richiesto'
      });
    }

    // Genera post completo con AI
    const result = await generateInstagramPost(
      topic,
      style || 'sorriso',
      tone || 'professionale'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    // Salva nel database come bozza
    const insertPost = db.prepare(`
      INSERT INTO social_posts (
        studio_id, piattaforma, contenuto, immagine_url, stato
      ) VALUES (?, ?, ?, ?, 'bozza')
    `);

    const postResult = insertPost.run(
      studioId,
      'instagram',
      result.fullCaption,
      result.imageUrl
    );

    const postId = postResult.lastInsertRowid;

    res.json({
      success: true,
      postId: postId,
      caption: result.caption,
      hashtags: result.hashtags,
      fullCaption: result.fullCaption,
      imageUrl: result.imageUrl,
      style: result.style,
      tokensUsed: result.tokensUsed
    });

  } catch (error) {
    console.error('Errore generazione post:', error);
    res.status(500).json({
      success: false,
      error: 'Errore durante la generazione del post'
    });
  }
});

// ============================================
// POST Pubblica su Instagram (via Rube)
// ============================================
router.post('/api/social/publish-instagram', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { postId, imageUrl, caption } = req.body;

  try {
    console.log(`📤 Pubblicazione REALE su Instagram: postId=${postId}`);

    // Valida input
    if (!imageUrl || !caption) {
      return res.status(400).json({
        success: false,
        error: 'Immagine e caption richiesti'
      });
    }

    // Leggi immagine locale
    const imagePath = path.join(__dirname, '..', imageUrl);
    console.log('📷 Immagine locale:', imagePath);

    // Verifica che il file esista
    const fs = require('fs').promises;
    try {
      await fs.access(imagePath);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Immagine non trovata sul server'
      });
    }

    // Carica il file come buffer per upload
    const imageBuffer = await fs.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // === INTEGRAZIONE RUBE COMPOSIO ===
    // NOTA: Richiede installazione: npm install composio-core
    // E variabile ambiente: COMPOSIO_API_KEY=your_key

    // Controlla se Composio è configurato
    let composio = null;
    let useRealPublication = false;

    try {
      const { Composio } = require('composio-core');
      if (process.env.COMPOSIO_API_KEY && process.env.INSTAGRAM_CONNECTED_ACCOUNT_ID) {
        composio = new Composio(process.env.COMPOSIO_API_KEY);
        useRealPublication = true;
        console.log('✅ Composio configurato - pubblicazione REALE');
      } else {
        console.log('⚠️ Composio API key mancante - pubblicazione SIMULATA');
      }
    } catch (err) {
      console.log('⚠️ Composio non installato - pubblicazione SIMULATA');
    }

    // === MODALITÀ PUBBLICAZIONE ===
    if (!useRealPublication) {
      // FALLBACK: Pubblicazione simulata (per demo senza Composio)
      const mockInstagramPostId = `IG_${Date.now()}_DEMO`;

      if (postId) {
        db.prepare(`
          UPDATE social_posts
          SET
            stato = 'pubblicato',
            data_pubblicazione = datetime('now'),
            engagement = 0
          WHERE id = ? AND studio_id = ?
        `).run(postId, studioId);
      }

      return res.json({
        success: true,
        message: '✅ Post salvato (modalità demo)',
        instagramPostId: mockInstagramPostId,
        postId: postId,
        mode: 'DEMO',
        note: 'Per pubblicazione reale: npm install composio-core e configura COMPOSIO_API_KEY'
      });
    }

    console.log('🔄 Step 1: Creazione media container Instagram...');

    // STEP 1: Crea media container
    const containerResponse = await composio.execute({
      action: 'INSTAGRAM_CREATE_MEDIA_CONTAINER',
      params: {
        ig_user_id: '31913547444957826', // vintagecampers_official
        content_type: 'photo',
        caption: caption,
        image_file: {
          name: path.basename(imagePath),
          mimetype: 'image/png',
          data: imageBase64 // Base64 encoded image
        }
      },
      connectedAccountId: process.env.INSTAGRAM_CONNECTED_ACCOUNT_ID // Imposta in .env
    });

    if (!containerResponse.data || !containerResponse.data.id) {
      throw new Error('Errore creazione container Instagram');
    }

    const creationId = containerResponse.data.id;
    console.log('✅ Container creato:', creationId);

    // STEP 2: Attendi processing (max 30 secondi)
    console.log('⏳ Step 2: Attesa processing immagine...');
    let status = 'IN_PROGRESS';
    let attempts = 0;
    const maxAttempts = 15;

    while (status !== 'FINISHED' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aspetta 2 secondi

      const statusResponse = await composio.execute({
        action: 'INSTAGRAM_GET_POST_STATUS',
        params: {
          creation_id: creationId
        },
        connectedAccountId: process.env.INSTAGRAM_CONNECTED_ACCOUNT_ID
      });

      status = statusResponse.data?.status_code || 'IN_PROGRESS';
      console.log(`   Status: ${status} (tentativo ${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    if (status !== 'FINISHED') {
      throw new Error('Timeout processing immagine Instagram');
    }

    console.log('✅ Processing completato');

    // STEP 3: Pubblica il post
    console.log('📤 Step 3: Pubblicazione post...');

    const publishResponse = await composio.execute({
      action: 'INSTAGRAM_CREATE_POST',
      params: {
        ig_user_id: '31913547444957826',
        creation_id: creationId
      },
      connectedAccountId: process.env.INSTAGRAM_CONNECTED_ACCOUNT_ID
    });

    const instagramPostId = publishResponse.data?.id;
    console.log('✅ Post pubblicato su Instagram:', instagramPostId);

    // Aggiorna database
    if (postId) {
      db.prepare(`
        UPDATE social_posts
        SET
          stato = 'pubblicato',
          data_pubblicazione = datetime('now'),
          engagement = 0
        WHERE id = ? AND studio_id = ?
      `).run(postId, studioId);
    }

    res.json({
      success: true,
      message: '✅ Post pubblicato REALMENTE su Instagram!',
      instagramPostId: instagramPostId,
      postId: postId,
      instagramUrl: `https://www.instagram.com/p/${instagramPostId}/`
    });

  } catch (error) {
    console.error('❌ Errore pubblicazione Instagram:', error);

    // Se l'errore è per Composio non installato, ritorna istruzioni
    if (error.message && error.message.includes('Cannot find module')) {
      return res.status(500).json({
        success: false,
        error: 'Composio SDK non installato',
        instructions: 'Esegui: npm install composio-core',
        details: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Errore durante la pubblicazione su Instagram',
      details: error.message
    });
  }
});

// ============================================
// GET Lista Post Salvati
// ============================================
router.get('/api/social/posts', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;

  try {
    const posts = db.prepare(`
      SELECT * FROM social_posts
      WHERE studio_id = ?
      ORDER BY id DESC
      LIMIT 100
    `).all(studioId);

    res.json({
      success: true,
      posts: posts
    });

  } catch (error) {
    console.error('Errore caricamento post:', error);
    res.status(500).json({
      success: false,
      error: 'Errore caricamento post'
    });
  }
});

// ============================================
// DELETE Elimina Post
// ============================================
router.delete('/api/social/:id', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const postId = req.params.id;

  try {
    db.prepare(`
      DELETE FROM social_posts
      WHERE id = ? AND studio_id = ?
    `).run(postId, studioId);

    res.json({ success: true });

  } catch (error) {
    console.error('Errore eliminazione post:', error);
    res.status(500).json({
      success: false,
      error: 'Errore eliminazione post'
    });
  }
});

module.exports = router;
