const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { db } = require('../config/database');
const GmailService = require('../services/gmail.service');

// ============================================
// POST Invia Email Promo Visita + Pulizia
// ============================================
router.post('/api/promo/send-visita-pulizia', isAuthenticated, async (req, res) => {
  const studioId = req.session.studioId;
  const { emailAddresses } = req.body; // Array di indirizzi email

  if (!emailAddresses || !Array.isArray(emailAddresses)) {
    return res.status(400).json({
      success: false,
      error: 'Fornisci un array di indirizzi email'
    });
  }

  try {
    // Get Gmail tokens
    const gmailToken = db.prepare(`
      SELECT * FROM oauth_tokens
      WHERE studio_id = ? AND servizio = 'gmail' AND attivo = 1
    `).get(studioId);

    if (!gmailToken) {
      return res.status(401).json({
        success: false,
        error: 'Gmail non connesso'
      });
    }

    // Get studio info
    const studio = db.prepare('SELECT * FROM studios WHERE id = ?').get(studioId);

    // Initialize Gmail service
    const gmailService = new GmailService();
    gmailService.setCredentials({
      access_token: gmailToken.access_token,
      refresh_token: gmailToken.refresh_token,
      token_type: gmailToken.token_type,
      expiry_date: gmailToken.expiry_date,
      scope: gmailToken.scope
    });

    // Promo email template
    const subject = '🦷 Offerta Esclusiva: Visita + Pulizia Denti';

    const emailBody = `Buongiorno,

Siamo lieti di presentarLe la nostra **Offerta Speciale** dedicata alla salute del Suo sorriso!

🎁 **PROMOZIONE VISITA + PULIZIA DENTI**

✨ Cosa include:
- Visita odontoiatrica completa
- Pulizia dei denti professionale (ablazione tartaro)
- Controllo generale dello stato di salute orale
- Consigli personalizzati per l'igiene dentale

💰 **Prezzo Promozionale:** Disponibile solo per i primi 20 pazienti!

📞 **Prenoti subito il Suo appuntamento:**
Tel: ${studio.telefono || '(numero studio)'}
Email: ${studio.email || 'studio@dentalrossi.it'}

⏰ Offerta valida fino al ${getPromoEndDate()}

Non perda questa occasione per prendersi cura del Suo sorriso con il nostro team di professionisti!

Cordiali saluti,
${studio.nome || 'Studio Dentistico'}

---
SmileAgent - Il Tuo Partner per la Salute Dentale
Per cancellarsi dalla mailing list, risponda con "RIMUOVI"
`;

    // Send emails
    const results = [];
    for (const email of emailAddresses) {
      try {
        const result = await gmailService.sendReply(email, subject, emailBody);
        results.push({
          email,
          success: result.success,
          messageId: result.messageId
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error.message
        });
      }
    }

    // Count successes
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `Email inviate: ${successCount}/${results.length}`,
      successCount,
      failCount,
      results
    });

  } catch (error) {
    console.error('Error sending promo emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// POST Invia Email Promo a 4 Indirizzi Default
// ============================================
router.post('/api/promo/send-default', isAuthenticated, async (req, res) => {
  // 4 email di test (sostituisci con indirizzi reali)
  const defaultEmails = [
    'paziente1@example.com',
    'paziente2@example.com',
    'paziente3@example.com',
    'paziente4@example.com'
  ];

  // Usa l'endpoint principale
  req.body.emailAddresses = defaultEmails;
  return router.stack[0].handle(req, res);
});

// Helper function
function getPromoEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30); // 30 giorni da oggi
  return date.toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

module.exports = router;
