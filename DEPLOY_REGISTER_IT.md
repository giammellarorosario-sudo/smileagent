# 🚀 Deploy SmileAgent su Register.it

## ⚠️ IMPORTANTE: Requisiti Hosting

Register.it deve supportare **Node.js** per far funzionare SmileAgent.

### Verifica se hai:
1. **Hosting Node.js** ✅ (procedi con questa guida)
2. **Hosting Linux Standard** ❌ (NON supporta Node.js - devi upgradare)

---

## 📋 METODO 1: Hosting Node.js Register.it

### Step 1: Preparazione locale
```bash
# Dalla cartella smileagent-app
cd C:\Users\giamm\smileagent\smileagent-app

# Crea archivio (escludi node_modules)
tar --exclude='node_modules' --exclude='data' --exclude='.git' -czf smileagent-deploy.tar.gz .
```

### Step 2: Carica su server
1. Accedi a **cPanel/Plesk** Register.it
2. Vai su **File Manager**
3. Carica `smileagent-deploy.tar.gz` nella root del dominio
4. Estrai l'archivio

### Step 3: Configurazione server
Connetti via **SSH** (se disponibile):

```bash
# Entra nella directory
cd public_html  # o htdocs, dipende dalla configurazione

# Estrai file
tar -xzf smileagent-deploy.tar.gz

# Installa dipendenze
npm install --production

# Verifica file .env
cat .env
# Deve contenere GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w
```

### Step 4: Avvia applicazione

**Con PM2** (consigliato):
```bash
# Installa PM2 (solo prima volta)
npm install -g pm2

# Avvia app
pm2 start ecosystem.config.js --env production

# Salva configurazione per auto-restart
pm2 save
pm2 startup
```

**Senza PM2**:
```bash
# Avvia in background
nohup node server.js > output.log 2>&1 &
```

### Step 5: Configura reverse proxy

Nel cPanel, vai su **Application Manager** o **Setup Node.js App**:
- **Directory**: `/public_html` (o il tuo path)
- **Entry Point**: `server.js`
- **Port**: `3000` (o assegnata dal pannello)
- **Environment Variables**:
  - `NODE_ENV=production`
  - `GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w`

✅ **Fatto!** L'app sarà disponibile su `https://tuodominio.it`

---

## 📋 METODO 2: Hosting Linux Standard (ALTERNATIVA)

Se Register.it **NON supporta Node.js**, hai 2 opzioni:

### Opzione A: Upgrade a Hosting Node.js
Contatta Register.it e passa a un piano con supporto Node.js

### Opzione B: Deploy su servizio esterno + Redirect
1. Deploy app su servizio gratuito:
   - **Render.com** (gratuito)
   - **Railway.app** (gratuito)
   - **Vercel** (gratuito per Node.js)

2. Su Register.it, crea un redirect:
```apache
# .htaccess
RewriteEngine On
RewriteRule ^(.*)$ https://tua-app.onrender.com/$1 [R=301,L]
```

---

## 🔧 METODO 3: Deploy Render.com (CONSIGLIATO se Register.it non supporta Node)

### Step 1: Prepara repository Git
```bash
# Dalla cartella smileagent
cd C:\Users\giamm\smileagent\smileagent-app

# Inizializza git (se non esiste)
git init
git add .
git commit -m "Deploy SmileAgent"

# Crea repo su GitHub
# Puoi usare GitHub Desktop o:
gh repo create smileagent --public --source=. --push
```

### Step 2: Deploy su Render
1. Vai su https://render.com (registrati gratis)
2. Click **New +** → **Web Service**
3. Connetti repository GitHub
4. Configurazione:
   - **Name**: `smileagent`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`

5. **Environment Variables**:
   ```
   NODE_ENV=production
   GEMINI_API_KEY=AIzaSyBJZnNc0t2LC4fZY6Feyr7NDdPIDzZnF8w
   SESSION_SECRET=smileagent-prod-secret-change-this
   PORT=3000
   ```

6. Click **Create Web Service**

⏳ Render farà il deploy automatico in ~5 minuti

✅ App disponibile su: `https://smileagent.onrender.com`

### Step 3 (opzionale): Dominio personalizzato
Su Render:
1. Vai su **Settings** → **Custom Domain**
2. Aggiungi: `smileagent.tuodominio.it`
3. Su Register.it, aggiungi record DNS:
   ```
   Type: CNAME
   Name: smileagent
   Value: smileagent.onrender.com
   ```

---

## 🧪 TEST DOPO DEPLOY

```bash
# Test endpoint
curl https://tuodominio.it

# Dovrebbe restituire HTML della landing page
```

### Test funzionalità:
1. Apri `https://tuodominio.it`
2. Login: `studio@dentalrossi.it` / `demo123`
3. Testa:
   - ✅ Dashboard
   - ✅ Chat AI
   - ✅ Gestione pazienti
   - ✅ Social Media
   - ✅ Analisi radiografie

---

## ❗ TROUBLESHOOTING

### Errore: "Cannot connect to server"
- Verifica che Node.js sia in esecuzione:
  ```bash
  pm2 status
  # oppure
  ps aux | grep node
  ```

### Errore: "502 Bad Gateway"
- Verifica la porta in `.htaccess` corrisponda a quella in `.env`
- Controlla i log: `pm2 logs`

### Errore: "Gemini API non funziona"
- Verifica variabile ambiente:
  ```bash
  echo $GEMINI_API_KEY
  ```

### Database non si crea
```bash
# Crea directory manualmente
mkdir -p data
chmod 755 data

# Riavvia app
pm2 restart smileagent
```

---

## 🎯 RACCOMANDAZIONI

### Per Register.it:
- ✅ Usa **Hosting Node.js** se disponibile
- ✅ Attiva **SSL/HTTPS** (Let's Encrypt gratuito)
- ✅ Usa **PM2** per gestione processo
- ✅ Configura **backup automatici** database

### Per produzione seria:
- 🚀 **Render.com** / **Railway.app** (migliore per Node.js)
- 💰 Costo: **$0/mese** per iniziare
- ⚡ Deploy automatico da Git
- 🔒 HTTPS incluso
- 📊 Monitoring incluso

---

## 📞 SUPPORTO

Se Register.it **non supporta Node.js**:
1. Contatta supporto Register.it per upgrade
2. OPPURE usa Render.com (consigliato) - è gratuito e più performante

---

## ✅ CHECKLIST DEPLOY

- [ ] Hosting supporta Node.js
- [ ] File `.env` caricato con API key
- [ ] Dipendenze installate (`npm install`)
- [ ] App avviata (PM2 o manuale)
- [ ] SSL/HTTPS attivo
- [ ] Test login funzionante
- [ ] Test Chat AI funzionante
- [ ] Backup configurato

---

💡 **Consiglio**: Se Register.it non supporta Node.js, **usa Render.com** - è più semplice, gratuito e ottimizzato per Node.js!
