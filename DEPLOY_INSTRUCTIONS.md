# 🚀 SmileAgent - Istruzioni Deploy DEMO

## ✅ DEPLOY IMMEDIATO (5 minuti)

### 1. **Carica cartella su server**
```bash
# Comprimi (da Windows)
tar -czf smileagent-app.tar.gz smileagent-app/

# Sul server
tar -xzf smileagent-app.tar.gz
cd smileagent-app
```

### 2. **Installa dipendenze**
```bash
npm install
```

### 3. **Verifica file critici**
- ✅ `.env` → deve contenere `GEMINI_API_KEY`
- ✅ `config/vertex-credentials.json` → deve esistere
- ✅ `data/` → cartella database (viene creata auto)

### 4. **Avvia server**
```bash
node server.js
```

✅ **Server attivo su**: `http://localhost:3000`

---

## 🔐 LOGIN DEMO
- **Email**: `studio@dentalrossi.it`
- **Password**: `demo123`

---

## 🎨 FUNZIONALITÀ ATTIVE

### ✅ **100% Funzionanti**
- Dashboard
- Gestione Pazienti
- Calendario
- Chat AI (Gemini)
- **Analisi Radiografie** (Gemini Vision + Imagen 3)
- **Social Media Instagram** (Generazione AI)

### 📸 **Social Instagram**
**Funziona adesso**:
- ✅ Generazione caption con Gemini
- ✅ Generazione immagini 1080x1080 con Imagen 3
- ✅ Preview stile Instagram
- ✅ Salvataggio database
- ⚠️ Pubblicazione SIMULATA (modalità demo)

**Per pubblicazione REALE**:
1. Installa Composio SDK:
   ```bash
   npm install composio-core
   ```

2. Registrati su: https://app.composio.dev

3. Connetti account Instagram

4. Aggiungi in `.env`:
   ```env
   COMPOSIO_API_KEY=tua_api_key
   INSTAGRAM_CONNECTED_ACCOUNT_ID=tuo_account_id
   ```

5. Riavvia server → Pubblicazione REALE attiva! 🚀

---

## 🧪 TEST VELOCE

```bash
# 1. Apri browser
http://localhost:3000

# 2. Login
studio@dentalrossi.it / demo123

# 3. Vai su "Social Media"

# 4. Genera post di test:
- Topic: "Sbiancamento denti"
- Stile: Sorriso
- Click "Genera Post con AI"

# 5. Attendi ~30 secondi
- Gemini genera caption
- Imagen 3 genera immagine

# 6. Vedi preview Instagram

# 7. Click "Pubblica"
- In modalità demo: salva come pubblicato
- Con Composio: pubblica REALMENTE su Instagram
```

---

## 📦 FILE ESSENZIALI

```
smileagent-app/
├── config/
│   ├── ai.js ← Gemini + Imagen
│   ├── vertex-credentials.json ← IMPORTANTE
│   └── database.js
├── routes/
│   ├── social.js ← Instagram automation
│   └── analisi.js ← Radiografie AI
├── views/pages/
│   └── social.ejs ← Frontend Instagram
├── .env ← API KEYS
├── package.json
└── server.js
```

---

## ⚡ TROUBLESHOOTING

### Errore: "Gemini API non funziona"
```bash
# Verifica .env
cat .env | grep GEMINI_API_KEY
```

### Errore: "Imagen 3 non funziona"
```bash
# Verifica credenziali Vertex AI
ls -la config/vertex-credentials.json
```

### Errore: "Database non trovato"
```bash
# Crea directory
mkdir -p data
# Riavvia server (crea DB auto)
node server.js
```

---

## 🌐 DEPLOY PRODUZIONE

### **Render / Railway / Heroku**
1. Push su Git repo
2. Connetti servizio
3. Aggiungi variabili ambiente:
   - `GEMINI_API_KEY`
   - `COMPOSIO_API_KEY` (opzionale)
   - `INSTAGRAM_CONNECTED_ACCOUNT_ID` (opzionale)
4. Deploy automatico! 🚀

### **VPS (Ubuntu)**
```bash
# Installa Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Carica app
cd /var/www/smileagent-app
npm install

# PM2 per produzione
sudo npm install -g pm2
pm2 start server.js --name smileagent
pm2 startup
pm2 save

# Nginx reverse proxy
# ... configurazione standard ...
```

---

## 🎯 PRONTO PER DEMO! ✅

**TUTTO FUNZIONA** - puoi fare demo immediata di:
- Generazione post Instagram con AI
- Analisi radiografie con AI
- Chat intelligente
- Gestione completa studio

**Per Instagram reale**: segui sezione "Per pubblicazione REALE" sopra.

---

💡 **Note**: La pubblicazione Instagram è in modalità demo (simulata) finché non configuri Composio. Tutte le altre funzionalità sono 100% operative!
