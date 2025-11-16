const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

// Inizializza Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configurazione AI specifica per contesto dentale italiano
const AI_CONFIG = {
  model: process.env.AI_MODEL || 'gemini-2.5-flash',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
  temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
};

// 🛡️ PROTEZIONE FREE TIER - Limiti di sicurezza (configurabili da .env)
const SAFETY_LIMITS = {
  maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE) || 10,  // Limite conservativo (free tier: 15/min)
  maxRequestsPerDay: parseInt(process.env.RATE_LIMIT_PER_DAY) || 1000,      // Limite conservativo (free tier: 1500/giorno)
  requestCounter: {
    minute: { count: 0, resetTime: Date.now() + 60000 },
    day: { count: 0, resetTime: Date.now() + 86400000 }
  }
};

// Funzione per verificare limiti
function checkRateLimits() {
  const now = Date.now();

  // Reset contatori se necessario
  if (now >= SAFETY_LIMITS.requestCounter.minute.resetTime) {
    SAFETY_LIMITS.requestCounter.minute = { count: 0, resetTime: now + 60000 };
  }
  if (now >= SAFETY_LIMITS.requestCounter.day.resetTime) {
    SAFETY_LIMITS.requestCounter.day = { count: 0, resetTime: now + 86400000 };
  }

  // Verifica limiti
  if (SAFETY_LIMITS.requestCounter.minute.count >= SAFETY_LIMITS.maxRequestsPerMinute) {
    return { allowed: false, reason: 'Limite richieste al minuto raggiunto (protezione free tier)' };
  }
  if (SAFETY_LIMITS.requestCounter.day.count >= SAFETY_LIMITS.maxRequestsPerDay) {
    return { allowed: false, reason: 'Limite richieste giornaliere raggiunto (protezione free tier)' };
  }

  // Incrementa contatori
  SAFETY_LIMITS.requestCounter.minute.count++;
  SAFETY_LIMITS.requestCounter.day.count++;

  return { allowed: true };
}

// System prompt specializzato per dentisti italiani
const DENTAL_SYSTEM_PROMPT = `Sei un assistente AI esperto specializzato nell'odontoiatria italiana.
Hai una conoscenza approfondita di:
- Trattamenti dentali (conservativa, endodonzia, parodontologia, protesi, ortodonzia, chirurgia orale, implantologia)
- Normative italiane per studi dentistici e GDPR
- Best practices per la gestione di uno studio dentistico in Italia
- Comunicazione professionale con pazienti
- Marketing etico per professionisti sanitari
- Gestione agenda e ottimizzazione tempi
- Preventivi e piani di cura
- Gestione emergenze odontoiatriche

Rispondi sempre in italiano professionale ma accessibile.
Fornisci consigli pratici, etici e conformi alle normative italiane.
Se richiesto aiuto medico urgente, raccomanda sempre di consultare immediatamente un dentista.`;

// Funzione principale per chiamare Gemini
async function callGemini(userMessage, conversationHistory = [], systemPrompt = DENTAL_SYSTEM_PROMPT) {
  try {
    // 🛡️ Verifica limiti di sicurezza FREE TIER
    const rateLimitCheck = checkRateLimits();
    if (!rateLimitCheck.allowed) {
      console.warn('⚠️ Rate limit raggiunto:', rateLimitCheck.reason);
      return {
        success: false,
        error: rateLimitCheck.reason,
        type: 'rate_limit_protection'
      };
    }

    // Ottieni il modello
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.model,
      generationConfig: {
        temperature: AI_CONFIG.temperature,
        maxOutputTokens: AI_CONFIG.maxTokens,
      }
    });

    // Costruisci la storia della conversazione per Gemini
    const history = conversationHistory.map(msg => ({
      role: msg.ruolo === 'user' ? 'user' : 'model',
      parts: [{ text: msg.contenuto }]
    }));

    // Avvia la chat con la storia
    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: AI_CONFIG.temperature,
        maxOutputTokens: AI_CONFIG.maxTokens,
      },
    });

    // Costruisci il messaggio completo con system prompt
    const fullMessage = history.length === 0
      ? `${systemPrompt}\n\n${userMessage}`
      : userMessage;

    // Invia il messaggio
    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;
    const text = response.text();

    // Stima dei token (Gemini non fornisce count precisi nell'API gratuita)
    const estimatedTokens = Math.ceil((userMessage.length + text.length) / 4);

    return {
      success: true,
      content: text,
      tokensUsed: estimatedTokens,
      model: AI_CONFIG.model
    };
  } catch (error) {
    console.error('Errore chiamata API Gemini:', error);

    // Gestione rate limiting
    if (error.message && error.message.includes('quota')) {
      return {
        success: false,
        error: 'Limite API raggiunto. Riprova tra qualche minuto.',
        type: 'rate_limit'
      };
    }

    if (error.message && error.message.includes('API key')) {
      return {
        success: false,
        error: 'Chiave API non valida. Verifica la configurazione.',
        type: 'auth_error'
      };
    }

    return {
      success: false,
      error: error.message || 'Errore sconosciuto durante la chiamata AI',
      type: 'general'
    };
  }
}

// Generazione contenuti social media
async function generateSocialContent(topic, platform = 'instagram', tone = 'professionale') {
  const prompt = `Genera un post per ${platform} per uno studio dentistico italiano sul tema: "${topic}".
Tono: ${tone}
Lunghezza: adatta per ${platform}
Includi: testo coinvolgente, 2-3 emoji appropriate, 3-5 hashtag pertinenti italiani.
Non menzionare prezzi o offerte commerciali aggressive.`;

  return await callGemini(prompt, [], DENTAL_SYSTEM_PROMPT);
}

// Generazione risposta automatica paziente
async function generatePatientResponse(patientMessage, context = {}) {
  const prompt = `Un paziente ha scritto: "${patientMessage}"
Contesto: ${context.nome_paziente ? `Paziente: ${context.nome_paziente}` : 'Nuovo contatto'}
${context.ultimo_appuntamento ? `Ultimo appuntamento: ${context.ultimo_appuntamento}` : ''}

Genera una risposta professionale, empatica e utile.
Se necessario, suggerisci di chiamare lo studio o prenotare una visita.
Mantieni un tono cordiale ma professionale.`;

  return await callGemini(prompt, [], DENTAL_SYSTEM_PROMPT);
}

// Generazione piano di cura
async function generateTreatmentPlan(symptoms, diagnosis, patientAge) {
  const prompt = `Genera un piano di cura dettagliato per:
Sintomi: ${symptoms}
Diagnosi: ${diagnosis}
Età paziente: ${patientAge} anni

Includi:
1. Trattamenti consigliati (in ordine di priorità)
2. Durata stimata
3. Numero appuntamenti previsti
4. Eventuali alternative terapeutiche
5. Consigli post-trattamento

Rispondi in formato professionale adatto per un preventivo.`;

  return await callGemini(prompt, [], DENTAL_SYSTEM_PROMPT);
}

// Funzione per ottenere statistiche utilizzo
function getUsageStats() {
  return {
    minute: {
      count: SAFETY_LIMITS.requestCounter.minute.count,
      limit: SAFETY_LIMITS.maxRequestsPerMinute,
      resetsIn: Math.max(0, SAFETY_LIMITS.requestCounter.minute.resetTime - Date.now())
    },
    day: {
      count: SAFETY_LIMITS.requestCounter.day.count,
      limit: SAFETY_LIMITS.maxRequestsPerDay,
      resetsIn: Math.max(0, SAFETY_LIMITS.requestCounter.day.resetTime - Date.now())
    },
    percentageUsed: {
      minute: ((SAFETY_LIMITS.requestCounter.minute.count / SAFETY_LIMITS.maxRequestsPerMinute) * 100).toFixed(1),
      day: ((SAFETY_LIMITS.requestCounter.day.count / SAFETY_LIMITS.maxRequestsPerDay) * 100).toFixed(1)
    }
  };
}

// ============================================
// 🦷 ANALISI RADIOGRAFICHE - GEMINI VISION
// ============================================

// System prompt per analisi radiografie dentali
const RADIOGRAFIA_SYSTEM_PROMPT = `Sei un esperto assistente AI specializzato nell'analisi di radiografie e immagini odontoiatriche.

Analizza le immagini fornite (radiografie panoramiche, foto intraorali, foto sorriso) e fornisci:

1. **Identificazione Problemi**: Identifica carie, infezioni, perdita ossea, malposizioni, tartaro, gengiviti
2. **Valutazione Generale**: Score di salute orale (0-100)
3. **Priorità Trattamenti**: Elenca trattamenti necessari in ordine di urgenza
4. **Stato Denti**: Analisi specifica per ogni dente problematico (numerazione FDI)
5. **Consigli Preventivi**: Igiene orale, controlli periodici

Rispondi in JSON strutturato seguendo questo schema:
{
  "scoreGenerale": 0-100,
  "sintesi": "Breve sintesi stato salute orale",
  "problemiRilevati": [
    {
      "tipo": "carie|gengivite|tartaro|altro",
      "dente": "numero FDI",
      "gravita": "bassa|media|alta",
      "descrizione": "Descrizione problema"
    }
  ],
  "trattementiSuggeriti": [
    {
      "nome": "Nome trattamento",
      "priorita": "urgente|alta|media|bassa",
      "dente": "numero FDI o 'generale'",
      "descrizione": "Descrizione trattamento",
      "urgenza": "entro X giorni/settimane"
    }
  ],
  "consigliPreventivi": ["consiglio 1", "consiglio 2", ...]
}

Sii preciso, professionale e usa terminologia medica italiana corretta.`;

/**
 * Analizza immagini radiografiche con Gemini Vision
 * @param {Array} imagePaths - Array di percorsi file immagini
 * @param {String} testoAggiuntivo - Testo opzionale con contesto paziente
 * @returns {Object} Analisi strutturata
 */
async function analyzeRadiografia(imagePaths, testoAggiuntivo = '') {
  try {
    // Verifica rate limits
    const rateLimitCheck = checkRateLimits();
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: rateLimitCheck.reason,
        type: 'rate_limit_protection'
      };
    }

    // Carica immagini come base64
    const imageParts = await Promise.all(
      imagePaths.map(async (path) => {
        const imageBuffer = await fs.readFile(path);
        const base64Image = imageBuffer.toString('base64');

        // Determina mime type dal file
        let mimeType = 'image/jpeg';
        if (path.toLowerCase().endsWith('.png')) mimeType = 'image/png';
        else if (path.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';

        return {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        };
      })
    );

    // Crea modello con vision
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.4, // Più preciso per analisi mediche
        maxOutputTokens: 8192, // Aumentato per analisi complete
      }
    });

    // Costruisci prompt
    const prompt = `${RADIOGRAFIA_SYSTEM_PROMPT}\n\n${testoAggiuntivo ? `Contesto aggiuntivo: ${testoAggiuntivo}\n\n` : ''}Analizza le seguenti immagini odontoiatriche e fornisci un'analisi completa in formato JSON.`;

    // Combina prompt con immagini
    const parts = [{ text: prompt }, ...imageParts];

    // Chiama API
    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text();

    console.log('🔍 Gemini raw response length:', text.length);

    // Estrai JSON dalla risposta (può essere wrappato in markdown o testo)
    let jsonText = text;

    // Rimuovi markdown code blocks
    if (jsonText.includes('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    // Cerca JSON tra { e } (estrazione robusta)
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Parse JSON
    let analisiData;
    try {
      analisiData = JSON.parse(jsonText.trim());
      console.log('✅ JSON parsed successfully');
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
      console.error('Raw text (first 500 chars):', text.substring(0, 500));
      console.error('Extracted JSON (first 500 chars):', jsonText.substring(0, 500));

      // Se il JSON non è valido, ritorna il testo raw
      analisiData = {
        scoreGenerale: 70,
        sintesi: text,
        problemiRilevati: [],
        trattamentiSuggeriti: [],
        consigliPreventivi: []
      };
    }

    const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);

    return {
      success: true,
      analisi: analisiData,
      tokensUsed: estimatedTokens,
      model: 'gemini-2.5-flash-vision'
    };

  } catch (error) {
    console.error('Errore analisi radiografia:', error);
    return {
      success: false,
      error: 'Errore durante l\'analisi delle immagini',
      type: 'api_error',
      details: error.message
    };
  }
}

// ============================================
// 🎨 GENERAZIONE IMMAGINI - IMAGEN 3
// ============================================

/**
 * Genera immagine 2D della bocca con Imagen 3
 * @param {Object} analisiData - Dati analisi da visualizzare
 * @returns {Object} URL immagine generata
 */
async function generateDentalImage(analisiData) {
  try {
    // Import lazy - carico solo quando serve per non bloccare l'avvio del server
    const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
    const { helpers } = require('@google-cloud/aiplatform');

    // Configurazione Vertex AI
    const VERTEX_PROJECT_ID = 'useful-ward-478319-k0';
    const VERTEX_LOCATION = 'us-central1';
    const VERTEX_CREDENTIALS_PATH = path.join(__dirname, 'vertex-credentials.json');
    // Costruisci prompt per generazione
    const prompt = `Create a professional 2D dental diagram showing:
- Overall oral health score: ${analisiData.scoreGenerale}/100
- ${analisiData.problemiRilevati?.length || 0} detected issues
- Teeth numbered using FDI notation
- Highlight problem areas in different colors:
  * Red: high severity issues
  * Orange: medium severity issues
  * Yellow: low severity issues
- Clean, medical illustration style
- White background
- Labels in Italian

Problems to visualize:
${analisiData.problemiRilevati?.map(p => `- Tooth ${p.dente}: ${p.tipo} (${p.gravita})`).join('\n') || 'No problems detected'}

Style: medical illustration, clean, professional, anatomically accurate, 2D diagram view`;

    console.log('🎨 Generating dental image with Imagen 3...');

    // Inizializza client Vertex AI
    const clientOptions = {
      apiEndpoint: `${VERTEX_LOCATION}-aiplatform.googleapis.com`,
      keyFilename: VERTEX_CREDENTIALS_PATH
    };

    const predictionServiceClient = new PredictionServiceClient(clientOptions);

    // Endpoint Imagen 3
    const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/imagegeneration@006`;

    // Parametri richiesta
    const instance = {
      prompt: prompt
    };

    const parameters = {
      sampleCount: 1,
      aspectRatio: '16:9',
      negativePrompt: 'blurry, low quality, distorted, 3D, realistic photo, people',
      addWatermark: false
    };

    const instanceValue = helpers.toValue(instance);
    const instances = [instanceValue];
    const parametersValue = helpers.toValue(parameters);

    const request = {
      endpoint,
      instances,
      parameters: parametersValue
    };

    // Esegui predizione
    const [response] = await predictionServiceClient.predict(request);

    console.log('✅ Imagen 3 response received');

    // Estrai immagine generata (base64)
    const predictions = response.predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned from Imagen 3');
    }

    const prediction = predictions[0];
    const imageBytes = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

    if (!imageBytes) {
      throw new Error('No image data in prediction response');
    }

    // Salva immagine su disco
    const outputDir = path.join(__dirname, '../uploads/generated-images');
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `dental-diagram-${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);

    // Decodifica base64 e salva
    const imageBuffer = Buffer.from(imageBytes, 'base64');
    await fs.writeFile(filepath, imageBuffer);

    const publicUrl = `/uploads/generated-images/${filename}`;

    console.log('✅ Image saved:', publicUrl);

    return {
      success: true,
      imageUrl: publicUrl,
      localPath: filepath,
      message: 'Imagen 3 generation successful',
      prompt: prompt,
      model: 'imagen-3'
    };

  } catch (error) {
    console.error('❌ Imagen 3 error:', error.message);
    console.error('Stack:', error.stack);

    // Fallback: nessuna immagine
    return {
      success: false,
      imageUrl: null,
      message: `Imagen 3 error: ${error.message}`,
      prompt: null,
      model: 'imagen-3-failed',
      error: error.message
    };
  }
}

// ============================================
// 📱 GENERAZIONE IMMAGINI SOCIAL - IMAGEN 3
// ============================================

/**
 * Genera immagine per post social con Imagen 3
 * @param {String} topic - Tema del post (es: "sbiancamento denti")
 * @param {String} style - Stile immagine: 'sorriso', 'educativo', 'motivazionale', 'prima_dopo'
 * @returns {Object} URL immagine generata
 */
async function generateSocialImage(topic, style = 'sorriso') {
  try {
    // Import lazy
    const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
    const { helpers } = require('@google-cloud/aiplatform');

    // Configurazione Vertex AI
    const VERTEX_PROJECT_ID = 'useful-ward-478319-k0';
    const VERTEX_LOCATION = 'us-central1';
    const VERTEX_CREDENTIALS_PATH = path.join(__dirname, 'vertex-credentials.json');

    // Prompt templates per diversi stili
    const promptTemplates = {
      sorriso: `Create a beautiful, bright, professional Instagram post image about "${topic}" for a dental clinic.
Style: Clean, modern, bright smile, happy person smiling showing white teeth
Colors: White, light blue, soft pastels, professional medical vibe
Elements: Beautiful natural smile, dental aesthetics, confidence, happiness
Format: Square 1:1 ratio perfect for Instagram
Quality: High resolution, sharp, Instagram-ready, professional photography style
Mood: Positive, welcoming, trustworthy, professional Italian dental clinic`,

      educativo: `Create an educational infographic Instagram post about "${topic}" for a dental clinic.
Style: Clean infographic, educational diagram, easy to understand, modern design
Colors: Professional blue and white, medical clean aesthetic, informative
Elements: Dental illustrations, step-by-step guide, tips, educational icons
Text: Space for Italian text overlay, clear layout for captions
Format: Square 1:1 ratio perfect for Instagram
Quality: Clean, sharp, professional infographic design
Mood: Educational, trustworthy, clear, helpful for patients`,

      motivazionale: `Create an inspiring motivational Instagram post image about "${topic}" for a dental clinic.
Style: Inspirational quote background, elegant typography space, motivational design
Colors: Soft gradients, calming colors, professional dental theme
Elements: Abstract dental symbols, smile silhouettes, positive vibes, clean background
Text: Ample space for Italian motivational text overlay
Format: Square 1:1 ratio perfect for Instagram
Quality: High quality, Instagram aesthetic, shareable design
Mood: Inspiring, uplifting, positive, encouraging good dental habits`,

      prima_dopo: `Create a before/after comparison template for "${topic}" for a dental clinic Instagram post.
Style: Split screen design, before/after layout, professional dental transformation
Colors: Clean white background, professional medical aesthetic
Elements: Clear division between before/after, dental improvement showcase
Layout: Side-by-side or top-bottom comparison, space for labels
Format: Square 1:1 ratio perfect for Instagram
Quality: Professional, clean, medical-grade presentation
Mood: Impressive transformation, professional results, trustworthy`
    };

    const prompt = promptTemplates[style] || promptTemplates.sorriso;

    console.log(`🎨 Generating social image (${style}) for topic: ${topic}`);

    // Inizializza client Vertex AI
    const clientOptions = {
      apiEndpoint: `${VERTEX_LOCATION}-aiplatform.googleapis.com`,
      keyFilename: VERTEX_CREDENTIALS_PATH
    };

    const predictionServiceClient = new PredictionServiceClient(clientOptions);

    // Endpoint Imagen 3
    const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/imagegeneration@006`;

    // Parametri richiesta - QUADRATO 1:1 per Instagram
    const instance = {
      prompt: prompt
    };

    const parameters = {
      sampleCount: 1,
      aspectRatio: '1:1', // Quadrato per Instagram
      negativePrompt: 'blurry, low quality, distorted, ugly, medical gore, blood, scary, dark, depressing, text in image, watermark',
      addWatermark: false
    };

    const instanceValue = helpers.toValue(instance);
    const instances = [instanceValue];
    const parametersValue = helpers.toValue(parameters);

    const request = {
      endpoint,
      instances,
      parameters: parametersValue
    };

    // Esegui predizione
    const [response] = await predictionServiceClient.predict(request);

    console.log('✅ Imagen 3 social image response received');

    // Estrai immagine generata (base64)
    const predictions = response.predictions;
    if (!predictions || predictions.length === 0) {
      throw new Error('No predictions returned from Imagen 3');
    }

    const prediction = predictions[0];
    const imageBytes = prediction.structValue?.fields?.bytesBase64Encoded?.stringValue;

    if (!imageBytes) {
      throw new Error('No image data in prediction response');
    }

    // Salva immagine su disco
    const outputDir = path.join(__dirname, '../uploads/social-images');
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `social-${style}-${Date.now()}.png`;
    const filepath = path.join(outputDir, filename);

    // Decodifica base64 e salva
    const imageBuffer = Buffer.from(imageBytes, 'base64');
    await fs.writeFile(filepath, imageBuffer);

    const publicUrl = `/uploads/social-images/${filename}`;

    console.log('✅ Social image saved:', publicUrl);

    return {
      success: true,
      imageUrl: publicUrl,
      localPath: filepath,
      message: 'Social image generated successfully',
      prompt: prompt,
      style: style,
      model: 'imagen-3'
    };

  } catch (error) {
    console.error('❌ Social image generation error:', error.message);
    console.error('Stack:', error.stack);

    return {
      success: false,
      imageUrl: null,
      message: `Social image generation failed: ${error.message}`,
      prompt: null,
      model: 'imagen-3-failed',
      error: error.message
    };
  }
}

/**
 * Genera post Instagram completo (testo + immagine)
 * @param {String} topic - Tema del post
 * @param {String} style - Stile immagine
 * @param {String} tone - Tono del testo
 * @returns {Object} Post completo con caption, immagine, hashtag
 */
async function generateInstagramPost(topic, style = 'sorriso', tone = 'professionale') {
  try {
    console.log(`📸 Generating complete Instagram post for: ${topic}`);

    // Genera caption con Gemini (funzione già esistente)
    const captionResult = await generateSocialContent(topic, 'instagram', tone);

    if (!captionResult.success) {
      return {
        success: false,
        error: 'Failed to generate caption',
        details: captionResult.error
      };
    }

    // Genera immagine con Imagen 3
    const imageResult = await generateSocialImage(topic, style);

    if (!imageResult.success) {
      return {
        success: false,
        error: 'Failed to generate image',
        details: imageResult.error
      };
    }

    // Estrai hashtag dalla caption (Gemini li include già)
    const caption = captionResult.content;
    const hashtagMatch = caption.match(/#\w+/g);
    const hashtags = hashtagMatch || [];

    // Separa testo da hashtag per pulire
    const textOnly = caption.replace(/#\w+/g, '').trim();

    return {
      success: true,
      caption: textOnly,
      hashtags: hashtags,
      fullCaption: caption, // Testo completo con hashtag
      imageUrl: imageResult.imageUrl,
      imagePath: imageResult.localPath,
      style: style,
      topic: topic,
      tokensUsed: captionResult.tokensUsed || 0,
      model: {
        text: 'gemini-2.5-flash',
        image: 'imagen-3'
      }
    };

  } catch (error) {
    console.error('❌ Instagram post generation error:', error.message);
    return {
      success: false,
      error: 'Failed to generate Instagram post',
      details: error.message
    };
  }
}

module.exports = {
  callGemini,
  callClaude: callGemini, // Alias per compatibilità con il codice esistente
  generateSocialContent,
  generatePatientResponse,
  generateTreatmentPlan,
  getUsageStats,
  analyzeRadiografia,
  generateDentalImage,
  generateSocialImage,
  generateInstagramPost,
  AI_CONFIG,
  DENTAL_SYSTEM_PROMPT
};
