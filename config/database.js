const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/smileagent.db');
const db = new Database(dbPath);

// Abilita foreign keys
db.pragma('foreign_keys = ON');

// Schema database per SaaS dentisti
const initializeDatabase = () => {
  console.log('🗄️  Inizializzazione database...');

  // Tabella Utenti/Studi Dentistici
  db.exec(`
    CREATE TABLE IF NOT EXISTS studios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      telefono TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      partita_iva TEXT,
      piano TEXT DEFAULT 'trial',
      stato TEXT DEFAULT 'attivo',
      data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      ultimo_accesso DATETIME
    );
  `);

  // Tabella Team Members
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      email TEXT NOT NULL,
      ruolo TEXT NOT NULL,
      specializzazione TEXT,
      telefono TEXT,
      attivo INTEGER DEFAULT 1,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  // Tabella Pazienti
  db.exec(`
    CREATE TABLE IF NOT EXISTS pazienti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      cognome TEXT NOT NULL,
      email TEXT,
      telefono TEXT,
      data_nascita DATE,
      sesso TEXT,
      codice_fiscale TEXT,
      indirizzo TEXT,
      citta TEXT,
      cap TEXT,
      note TEXT,
      note_mediche TEXT,
      allergie TEXT,
      consenso_privacy INTEGER DEFAULT 0,
      consenso_marketing INTEGER DEFAULT 0,
      stato TEXT DEFAULT 'attivo',
      data_prima_visita DATE,
      data_ultima_visita DATE,
      data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  // Tabella Appuntamenti
  db.exec(`
    CREATE TABLE IF NOT EXISTS appuntamenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      paziente_id INTEGER NOT NULL,
      dentista_id INTEGER,
      data_ora DATETIME NOT NULL,
      durata_minuti INTEGER DEFAULT 30,
      tipo_trattamento TEXT,
      stato TEXT DEFAULT 'confermato',
      note TEXT,
      promemoria_inviato INTEGER DEFAULT 0,
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
      FOREIGN KEY (paziente_id) REFERENCES pazienti(id) ON DELETE CASCADE,
      FOREIGN KEY (dentista_id) REFERENCES team_members(id)
    );
  `);

  // Tabella Trattamenti
  db.exec(`
    CREATE TABLE IF NOT EXISTS trattamenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      paziente_id INTEGER NOT NULL,
      dentista_id INTEGER,
      appuntamento_id INTEGER,
      nome TEXT NOT NULL,
      descrizione TEXT,
      dente TEXT,
      costo DECIMAL(10,2),
      stato TEXT DEFAULT 'pianificato',
      data_esecuzione DATE,
      note TEXT,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
      FOREIGN KEY (paziente_id) REFERENCES pazienti(id) ON DELETE CASCADE,
      FOREIGN KEY (dentista_id) REFERENCES team_members(id),
      FOREIGN KEY (appuntamento_id) REFERENCES appuntamenti(id)
    );
  `);

  // Tabella Fatture
  db.exec(`
    CREATE TABLE IF NOT EXISTS fatture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      paziente_id INTEGER NOT NULL,
      numero_fattura TEXT UNIQUE NOT NULL,
      data_emissione DATE NOT NULL,
      importo DECIMAL(10,2) NOT NULL,
      iva DECIMAL(10,2) DEFAULT 0,
      totale DECIMAL(10,2) NOT NULL,
      stato TEXT DEFAULT 'da_pagare',
      data_pagamento DATE,
      metodo_pagamento TEXT,
      note TEXT,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
      FOREIGN KEY (paziente_id) REFERENCES pazienti(id) ON DELETE CASCADE
    );
  `);

  // Tabella Messaggi/Comunicazioni
  db.exec(`
    CREATE TABLE IF NOT EXISTS messaggi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      paziente_id INTEGER,
      tipo TEXT NOT NULL,
      canale TEXT NOT NULL,
      destinatario TEXT NOT NULL,
      oggetto TEXT,
      contenuto TEXT NOT NULL,
      stato TEXT DEFAULT 'bozza',
      data_invio DATETIME,
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
      FOREIGN KEY (paziente_id) REFERENCES pazienti(id)
    );
  `);

  // Tabella Social Media Posts
  db.exec(`
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      piattaforma TEXT NOT NULL,
      contenuto TEXT NOT NULL,
      immagine_url TEXT,
      stato TEXT DEFAULT 'bozza',
      data_programmata DATETIME,
      data_pubblicazione DATETIME,
      engagement INTEGER DEFAULT 0,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  // Tabella Chat AI Conversazioni
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversazioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      titolo TEXT,
      tipo TEXT DEFAULT 'generale',
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      ultima_attivita DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  // Tabella Chat AI Messaggi
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messaggi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversazione_id INTEGER NOT NULL,
      ruolo TEXT NOT NULL,
      contenuto TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tokens_usati INTEGER DEFAULT 0,
      FOREIGN KEY (conversazione_id) REFERENCES chat_conversazioni(id) ON DELETE CASCADE
    );
  `);

  // Tabella Knowledge Base (per training AI)
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      titolo TEXT NOT NULL,
      contenuto TEXT NOT NULL,
      tags TEXT,
      attivo INTEGER DEFAULT 1,
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  // 🦷 Tabella Analisi Radiografiche (B2B + future B2C)
  db.exec(`
    CREATE TABLE IF NOT EXISTS analisi_radiografiche (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      paziente_id INTEGER,
      dentista_id INTEGER,
      tipo_analisi TEXT DEFAULT 'completa',
      stato TEXT DEFAULT 'in_elaborazione',
      report_json TEXT,
      report_pdf_url TEXT,
      immagine_2d_url TEXT,
      score_salute INTEGER,
      problemi_rilevati TEXT,
      trattamenti_suggeriti TEXT,
      note TEXT,
      data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_completamento DATETIME,
      tokens_vision_usati INTEGER DEFAULT 0,
      immagini_generate INTEGER DEFAULT 0,
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE,
      FOREIGN KEY (paziente_id) REFERENCES pazienti(id) ON DELETE SET NULL,
      FOREIGN KEY (dentista_id) REFERENCES team_members(id) ON DELETE SET NULL
    );
  `);

  // 🖼️ Tabella Immagini Analisi (multi-upload)
  db.exec(`
    CREATE TABLE IF NOT EXISTS analisi_immagini (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      analisi_id INTEGER NOT NULL,
      tipo_immagine TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      ordine INTEGER DEFAULT 0,
      data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (analisi_id) REFERENCES analisi_radiografiche(id) ON DELETE CASCADE
    );
  `);

  // 📊 Tabella Quota Usage Tracking (protezione limiti)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quota_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studio_id INTEGER NOT NULL,
      tipo_risorsa TEXT NOT NULL,
      data_uso DATE NOT NULL,
      contatore INTEGER DEFAULT 1,
      ultima_richiesta DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(studio_id, tipo_risorsa, data_uso),
      FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE
    );
  `);

  console.log('✅ Database inizializzato con successo!');
};

module.exports = {
  db,
  initializeDatabase
};
