# 🦷 SmileAgent - Guida Deploy Completa

## ✅ STATO ATTUALE

**TUTTO FUNZIONANTE**:
- ✅ Server locale: `http://localhost:3000`
- ✅ Database SQLite operativo
- ✅ 32 test passati, 0 errori
- ✅ Gemini AI configurato
- ✅ Tutte le route funzionanti

---

## 🚀 OPZIONE 1: Deploy Locale (Windows)

### Avvio Rapido
```bash
cd C:\Users\giamm\smileagent\smileagent-app
node server.js
```

Apri: `http://localhost:3000`
Login: `studio@dentalrossi.it` / `demo123`

### Avvio Produzione (con PM2)
```bash
# Installa PM2 (solo prima volta)
npm install -g pm2

# Avvia con configurazione produzione
START_PRODUCTION.bat
```

---

## 🌐 OPZIONE 2: Deploy Register.it

### Prerequisito
Register.it **DEVE** supportare Node.js. Verifica il tuo piano:
- ✅ Hosting Node.js → Segui Metodo A
- ❌ Hosting Linux standard → Segui Metodo B

### Metodo A: Hosting Node.js Register.it

#### 1. Prepara archivio
```bash
cd C:\Users\giamm\smileagent

# Crea archivio (esclude file non necessari)
tar --exclude='node_modules' --exclude='data' --exclude='.git' --exclude='*.log' -czf smileagent-deploy.tar.gz smileagent-app/
```

#### 2. Carica su server
1. Accedi a **cPanel** Register.it
2. **File Manager** → Carica `smileagent-deploy.tar.gz`
3. Estrai archivio nella root del dominio

#### 3. Configura via SSH
```bash
# Connetti SSH (chiedi credenziali a Register.it)
ssh tuoutente@tuodominio.it

# Entra nella directory
cd public_html  # o htdocs

# Installa dipendenze
npm install --production

# Crea directory necessarie
mkdir -p data logs uploads

# Verifica .env
cat .env | grep GEMINI_API_KEY
# Deve mostrare: GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w
```

#### 4. Avvia applicazione
```bash
# Con PM2 (consigliato)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Test
pm2 status
pm2 logs smileagent
```

#### 5. Configura dominio
Nel **cPanel → Setup Node.js App**:
- Directory: `/public_html`
- Entry Point: `server.js`
- Port: `3000`
- Environment: `production`

✅ App disponibile su: `https://tuodominio.it`

### Metodo B: Register.it senza Node.js → Render.com

Se Register.it non supporta Node.js, usa **Render.com** (gratuito):

#### 1. Crea repository Git
```bash
cd C:\Users\giamm\smileagent\smileagent-app

# Inizializza Git
git init
git add .
git commit -m "Deploy SmileAgent"

# Crea repo GitHub (usa GitHub Desktop o CLI)
# Oppure crea manualmente su github.com e poi:
git remote add origin https://github.com/tuousername/smileagent.git
git push -u origin main
```

#### 2. Deploy su Render.com
1. Vai su https://render.com (registrati gratis)
2. **New +** → **Web Service**
3. Connetti repository GitHub `smileagent`
4. Configurazione:
   - Name: `smileagent`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: **Free**

5. **Environment Variables** (aggiungi):
   ```
   NODE_ENV=production
   GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w
   SESSION_SECRET=GENERA-STRINGA-CASUALE-SICURA
   ```

6. **Create Web Service**

⏳ Deploy automatico in 3-5 minuti

✅ App disponibile: `https://smileagent.onrender.com`

#### 3. Dominio personalizzato (opzionale)
**Su Render**:
- Settings → Custom Domain → `smileagent.tuodominio.it`

**Su Register.it DNS**:
```
Type: CNAME
Name: smileagent
Value: smileagent.onrender.com
TTL: 3600
```

---

## 🧪 TEST DOPO DEPLOY

### Test base
```bash
# Test endpoint
curl https://tuodominio.it

# Deve restituire HTML (landing page)
```

### Test funzionalità complete
1. Apri browser: `https://tuodominio.it`
2. Login: `studio@dentalrossi.it` / `demo123`
3. Test funzionalità:
   - ✅ Dashboard → Vedi statistiche
   - ✅ Chat AI → Scrivi "Ciao" e ricevi risposta
   - ✅ Pazienti → Vedi lista pazienti
   - ✅ Social Media → Genera post Instagram
   - ✅ Analisi → Carica radiografia (test)

---

## 🔧 TROUBLESHOOTING

### Errore: Server non risponde
```bash
# Verifica processo
pm2 status

# Riavvia
pm2 restart smileagent

# Vedi log errori
pm2 logs smileagent --err
```

### Errore: Database non trovato
```bash
# Crea directory
mkdir -p data
chmod 755 data

# Riavvia app (crea DB automaticamente)
pm2 restart smileagent
```

### Errore: Gemini API non funziona
```bash
# Verifica variabile ambiente
echo $GEMINI_API_KEY

# Se vuota, aggiungi a .env:
echo "GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w" >> .env

# Riavvia
pm2 restart smileagent
```

### Errore: 502 Bad Gateway
- Verifica che Node.js sia avviato: `pm2 status`
- Verifica porta in `.htaccess` corrisponda a `.env`
- Controlla log Apache/Nginx

### Errore: Cannot find module
```bash
# Reinstalla dipendenze
rm -rf node_modules
npm install --production
pm2 restart smileagent
```

---

## 📊 VERIFICA DEPLOY COMPLETA

Esegui script di test:
```bash
node test-deploy.js
```

Output atteso:
```
✅ Test passati: 32
⚠️  Warning: 1
❌ Test falliti: 0

✅ TUTTO OK! Pronto per il deploy!
```

---

## 🎯 RACCOMANDAZIONI PRODUZIONE

### Sicurezza
- [ ] Cambia `SESSION_SECRET` con stringa casuale
- [ ] Attiva HTTPS/SSL (Let's Encrypt gratuito)
- [ ] Configura firewall (porta 3000 solo da localhost)
- [ ] Backup database automatico giornaliero

### Performance
- [ ] Usa PM2 cluster mode (`instances: 'max'`)
- [ ] Abilita compressione (già in .htaccess)
- [ ] Configura cache CDN per assets statici
- [ ] Monitoring con PM2 Plus (gratuito)

### Backup
```bash
# Backup database
cp data/smileagent.db data/backup-$(date +%Y%m%d).db

# Backup automatico giornaliero (cron)
0 2 * * * cp /path/to/data/smileagent.db /path/to/backups/smileagent-$(date +\%Y\%m\%d).db
```

---

## 📞 SUPPORTO

### Register.it non supporta Node.js?
**Soluzione**: Usa **Render.com** (gratuito, più performante, specifico per Node.js)

### Altre piattaforme gratuite per Node.js
- ✅ **Render.com** (consigliato)
- ✅ **Railway.app**
- ✅ **Vercel**
- ✅ **Fly.io**

Tutte offrono:
- Deploy automatico da Git
- HTTPS incluso
- Monitoring gratuito
- Database SQLite supportato

---

## ✅ CHECKLIST FINALE

### Pre-deploy
- [ ] Test locale funzionante (`node server.js`)
- [ ] `node test-deploy.js` → tutti test passati
- [ ] File `.env` con API key valida
- [ ] Dipendenze installate (`npm install`)

### Deploy
- [ ] App caricata su server
- [ ] PM2 avviato (`pm2 status`)
- [ ] SSL/HTTPS attivo
- [ ] Dominio configurato

### Post-deploy
- [ ] Login funzionante
- [ ] Chat AI risponde
- [ ] Social Media genera post
- [ ] Analisi radiografie funziona
- [ ] Backup configurato

---

## 🚀 DEPLOY VELOCE (Render.com)

**Tempo totale: 10 minuti**

```bash
# 1. Crea repo Git (2 min)
git init && git add . && git commit -m "Deploy"

# 2. Push su GitHub (2 min)
gh repo create smileagent --public --source=. --push

# 3. Deploy su Render.com (5 min)
# - Vai su render.com
# - New Web Service
# - Connetti GitHub
# - Aggiungi GEMINI_API_KEY
# - Deploy!

# 4. App online! (1 min)
# https://smileagent.onrender.com
```

---

💡 **Il modo più semplice**: Usa **Render.com** - zero configurazione, deploy automatico, gratuito!
