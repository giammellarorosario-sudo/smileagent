# 🚀 Masterprompt con Prompt Caching - Guida Completa

## 🎯 Cos'è il Prompt Caching?

Il **Prompt Caching** di Claude riduce il consumo di token memorizzando le parti statiche (non cambiano) del prompt tra richieste successive.

### Benefici
- ✅ **90% token risparmiati** dopo la prima richiesta
- ✅ **3x più iterazioni** con stesso limite 150k
- ✅ **Risposte più veloci** (cache hit immediato)
- ✅ **Sessioni overnight più lunghe** (4-5h → 12-15h potenziali)

---

## 📊 Metriche di Efficienza

### Senza Caching (Standard)
```
Richiesta 1: 5000 token (masterprompt) + 2000 (risposta) = 7000 token
Richiesta 2: 5000 token (masterprompt) + 2000 (risposta) = 7000 token
...
Totale 150k / 7000 = ~21 iterazioni ❌
Durata stimata: 4-5 ore
```

### Con Caching (Ottimizzato)
```
Richiesta 1: 5000 token (full prompt) + 2000 (risposta) = 7000 token
Richiesta 2:  500 token (90% cached!) + 2000 (risposta) = 2500 token
Richiesta 3:  500 token + 2000 = 2500 token
...
Totale 150k / 2500 = ~60 iterazioni ✅ (3x miglioramento!)
Durata stimata: 12-15 ore (limitata a 8h overnight)
```

---

## 📂 File Disponibili

### 1. `backend-elite-cached.md`
**Masterprompt Backend Automation & API**
- Identità: Top 0.001% Senior Backend Engineer
- Stack: Node.js, Python, Go, SQL/NoSQL, Cloud (AWS/GCP)
- Focus: API design, automation, microservices, TDD
- ~4500 token sezione cached

### 2. `uiux-elite-cached.md`
**Masterprompt UI/UX SaaS Specialist**
- Identità: Top 0.001% Product Designer
- Stack: React, Vue, Tailwind, Next.js, design systems
- Focus: SaaS dashboards, responsive design, accessibility
- ~4500 token sezione cached

---

## 🚦 Come Usare i Masterprompt

### Opzione A: Copia-Incolla Completo (Consigliato)

**Step 1: Apri Claude Code**
```bash
claude
```

**Step 2: Copia TUTTO il contenuto del masterprompt**
```bash
# Per Backend:
cat .claude/prompts/backend-elite-cached.md

# Per UI/UX:
cat .claude/prompts/uiux-elite-cached.md
```

**Step 3: Incolla nella chat**
- Incolla l'intero masterprompt come primo messaggio
- Claude memorizzerà automaticamente la sezione static in cache

**Step 4: Rispondi alle domande**
```
Claude chiederà:
1. Overnight Mode (YES/NO)?
2. Task description?
3. Success criteria?

Tu rispondi con task specifico
```

**Step 5: Lavora normalmente**
- Ogni richiesta successiva userà la cache (90% token risparmiati)
- Cache TTL: 5 minuti (si rinnova ad ogni uso)
- Mantieni conversazione attiva (<4 min idle)

### Opzione B: Template Quick-Start (Più Veloce)

Usa i file quick-start per iniziare rapidamente:

**Backend:**
```bash
cat .claude/prompts/quick-start-backend.txt
```

**UI/UX:**
```bash
cat .claude/prompts/quick-start-uiux.txt
```

Questi includono:
- Masterprompt completo
- Template task pre-compilato
- Esempi di overnight tasks

---

## ⏰ Gestione Cache (Important!)

### Cache TTL: 5 Minuti
La cache Claude scade dopo 5 minuti di inattività.

**❌ Cache si perde se:**
- Pausi >5 minuti senza messaggi
- Chiudi e riapri Claude Code
- Cambi conversazione

**✅ Per mantenere cache:**
- Rispondi entro 4 minuti
- Claude continua a lavorare autonomamente (overnight mode)
- Ogni richiesta rinnova il TTL

**Se cache si perde:**
- Non è un problema critico
- Prima richiesta successiva ricarica (5000 token)
- Richieste seguenti tornano cached (500 token)

---

## 📋 Best Practices Overnight Mode

### 1. Preparazione Pre-Sessione

**Setup Timer/Alarm** (Consigliato: Free Alarm Clock)
```
22:00 - Inizio sessione
00:00 - Check token count
02:00 - Check token count
04:00 - Check critico (se vicino 120k, fermati)
06:00 - Sveglia finale
```

**Verifica Overnight-Dev Plugin Attivo**
```bash
# Git hooks installati?
ls -la .git/hooks/ | grep -E "pre-commit|commit-msg"

# Configurazione presente?
cat .overnight-dev.json
```

### 2. Durante la Sessione

**Mantieni Cache Attiva**
- Overnight mode = Claude risponde automaticamente (<4 min)
- Se in modalità interattiva, rispondi entro 4 minuti

**Monitora Token Usage**
- Ogni 50 commit Claude ti darà checkpoint automatico
- A ~120k token → Warning critico
- Ferma a 140-145k per sicurezza

**Commit Frequenti**
- Overnight-dev hooks forzano test passing
- Ogni feature completata = commit
- Git history pulita e tracciabile

### 3. Post-Sessione

**Review Mattutina**
```bash
# Quanti commit overnight?
git log --oneline --since="yesterday" | wc -l

# Quali file modificati?
git diff HEAD~10..HEAD --stat

# Tutti i test passano?
npm test  # o python -m pytest, cargo test, etc.
```

---

## 🎯 Esempi Completi

### Esempio 1: Backend Overnight (Payment API)

**Inizio sessione (22:00)**
```
1. Apri Claude Code
2. Incolla: backend-elite-cached.md
3. Claude chiede: "Overnight Mode (YES/NO)?"
4. Tu: "YES"
5. Claude chiede: "Task?"
6. Tu:
   "Build complete payment API with Stripe integration:
   - POST /api/payments/checkout (create session)
   - POST /api/webhooks/stripe (handle events)
   - GET /api/payments/:id (retrieve payment)
   - Implement subscription management
   - TDD with >85% coverage
   - Fully documented OpenAPI spec"
7. Vai a dormire
```

**Mattina (06:00)**
```bash
# Verifica risultato
git log --oneline --since="22:00 yesterday"
# Output:
# a1b2c3d feat: add Stripe checkout endpoint with tests
# d4e5f6g feat: implement webhook handler for payment events
# g7h8i9j feat: add payment retrieval endpoint
# j0k1l2m feat: subscription create/cancel/update
# m3n4o5p docs: complete OpenAPI spec for payment API
# p6q7r8s test: add integration tests for webhooks

npm test
# ✅ All 47 tests passing, coverage 89%
```

### Esempio 2: UI/UX Overnight (Admin Dashboard)

**Inizio sessione (22:00)**
```
1. Apri Claude Code
2. Incolla: uiux-elite-cached.md
3. Claude: "Overnight Mode?"
4. Tu: "YES"
5. Claude: "UI/UX task?"
6. Tu:
   "Build complete SaaS admin dashboard:
   - Responsive layout (sidebar + main)
   - KPI cards (Revenue, Users, MRR, Churn)
   - Data table (sortable, filterable, paginated)
   - Charts (line chart for revenue trend)
   - Dark mode support
   - Mobile-first, Tailwind CSS
   - Accessibility WCAG AA
   - Storybook for all components"
7. Vai a dormire
```

**Mattina (06:00)**
```bash
# Verifica commit
git log --oneline --since="22:00 yesterday" | head -10

# Verifica componenti Storybook
npm run storybook
# Browser apre http://localhost:6006
# Vedi: Button, Card, Table, Chart, Sidebar, Dashboard...

# Test Lighthouse
npm run build && npx lighthouse http://localhost:3000/dashboard
# Accessibility: 95/100 ✅
# Performance: 92/100 ✅
```

---

## 🛑 Troubleshooting

### Problema: Cache non sembra funzionare (risposte lente)

**Sintomo**: Ogni risposta impiega tanto tempo come la prima

**Cause possibili**:
1. Cache scaduta (>5 min idle)
2. Hai modificato il masterprompt tra richieste
3. Claude Code riavviato

**Soluzione**:
- Prossima richiesta ricostruisce cache automaticamente
- Verifica: Se risposta #2 è più veloce di #1 → cache funziona

### Problema: Token limit raggiunto troppo presto

**Sintomo**: Arrivo a 150k in 3-4 ore invece di 8-12h

**Cause possibili**:
1. Cache non attiva (masterprompt non usato)
2. Task troppo complesso (generazione codice enorme)
3. Molte richieste di chiarimenti (user-interaction)

**Soluzione**:
- Usa masterprompt cached (non prompt custom)
- Overnight Mode YES (Claude lavora autonomamente)
- Task ben definito (meno back-and-forth)

### Problema: Overnight Mode non parte autonomamente

**Sintomo**: Claude chiede conferma ad ogni step

**Cause possibili**:
1. Risposto "NO" a Overnight Mode
2. Git hooks non installati
3. Test falliscono (commit bloccato)

**Soluzione**:
```bash
# Reinstalla overnight-dev hooks
cp ~/.claude/plugins/marketplaces/claude-code-plugins-plus/plugins/productivity/overnight-dev/scripts/* .git/hooks/
chmod +x .git/hooks/pre-commit .git/hooks/commit-msg

# Verifica test passano
npm test

# Risposta YES a Overnight Mode
```

---

## 📈 Metriche di Successo

### Sessione Overnight Efficace

**Token Usage**:
- Prima richiesta: ~5-7k token
- Richieste successive: ~2.5k token (cache attiva)
- Totale sessione 8h: 100-140k token (sotto limite 150k)

**Output**:
- Commit: 20-50 commit (dipende da task)
- Test: >85% coverage, 0 failing
- Documentazione: README aggiornato, Storybook/OpenAPI completo

**Qualità**:
- Lighthouse (UI): >90 accessibility, >85 performance
- Security: 0 vulnerabilità (no hardcoded secrets)
- Git hooks: Tutti i commit hanno test passing

---

## 🎓 Tips Avanzati

### 1. Combina Backend + UI in Due Notti

**Notte 1: Backend**
```
Task: Build complete API (auth, users, data endpoints)
Result: Backend 100% funzionante, testato, documentato
```

**Notte 2: UI/UX**
```
Task: Build frontend che consuma API creata ieri
Result: Full-stack app completa
```

### 2. Usa Git Branches per Esperimenti

```bash
# Crea branch per overnight experiment
git checkout -b overnight/feature-x

# Mattina: merge se soddisfatto
git checkout main
git merge overnight/feature-x

# Oppure: scarta se non soddisfatto
git branch -D overnight/feature-x
```

### 3. Checkpoints Intermedi

Se vuoi controllo mid-session:

```bash
# Imposta alarm ogni 2h
02:00 - Sveglia
# Check progress:
git log --oneline --since="2 hours ago"
# Se soddisfatto, continua
# Se off-track, interrompi e correggi task
```

---

## 📞 Support & Feedback

**Issues Comuni**:
- Cache non funziona → Verifica masterprompt usato
- Token limit rapido → Usa Overnight Mode YES
- Test falliscono → Fix manualmente, poi riparti

**Miglioramenti**:
- Suggerisci ottimizzazioni aprendo issue
- Condividi risultati overnight (commit count, quality)

---

## 🎉 Sei Pronto!

**Quick Start**:
1. Scegli masterprompt (backend o UI/UX)
2. Copia-incolla in Claude Code
3. Rispondi YES a Overnight Mode
4. Fornisci task dettagliato
5. Vai a dormire
6. Sveglia con progetto completo! 🚀

**File Utili**:
- `backend-elite-cached.md` - Backend masterprompt
- `uiux-elite-cached.md` - UI/UX masterprompt
- `quick-start-backend.txt` - Template backend
- `quick-start-uiux.txt` - Template UI/UX

Buon coding overnight! 💤💻
