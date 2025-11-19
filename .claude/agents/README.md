# 🤖 Smile Agents - Auto-Activating AI Assistants

## Quick Start

**Smile Dev** (Backend) - Attivalo scrivendo:
```
"Smile Dev, build payment API"
"Hey Smile Dev, add user authentication"
```

**Smile UX** (UI/UX) - Attivalo scrivendo:
```
"Smile UX, create dashboard UI"
"Hey Smile UX, design landing page"
```

---

## 🎯 Differenze tra Agenti e Masterprompt

### Agenti (`.claude/agents/`) - QUESTI FILE
- ✅ **Attivazione automatica** quando menzioni il nome
- ✅ **Sempre disponibili** in background
- ✅ **Quick tasks** e sviluppo iterativo
- ✅ **Uso**: Scrivi "Smile Dev..." nella chat

### Masterprompt (`.claude/prompts/`)
- ⚙️ **Attivazione manuale** (copia-incolla)
- 📅 **Sessioni lunghe** overnight (6-8h)
- 📋 **Full control** su quando caricare
- 💾 **Uso**: `cat .claude/prompts/backend-elite-cached.md` → incolla

---

## 🚀 Come Usare gli Agenti

### Smile Dev (Backend)

**Attivazione automatica**:
```
Tu: "Smile Dev, build REST API for user management"

Agente: [Si carica automaticamente]
"🎯 SMILE DEV activated!

I'll build a consistent, production-ready user management API.

🌙 OVERNIGHT MODE ACTIVATION?
[YES] → 6-8h autonomous development
[NO] → Interactive mode

Your choice (YES/NO):"
```

**Caratteristiche**:
- ✅ Code style consistency enforced
- ✅ Identical output format across features
- ✅ Standardized error handling
- ✅ Uniform logging
- ✅ TDD mandatory

**Best per**:
- API endpoints
- Database models
- Authentication systems
- Payment integrations
- Webhook handlers

---

### Smile UX (UI/UX)

**Attivazione automatica**:
```
Tu: "Smile UX, create SaaS dashboard"

Agente: [Si carica automaticamente]
"🎨 SMILE UX activated!

I'll design a pixel-perfect, user-ready dashboard with extreme polish.

🌙 OVERNIGHT MODE ACTIVATION?
[YES] → 6-8h autonomous UI development
[NO] → Interactive design mode

Your choice (YES/NO):"
```

**Caratteristiche**:
- ✨ Extreme polish (micro-interactions perfect)
- 🎯 User-ready completeness (zero placeholders)
- 📱 Responsive perfection (320px to 4K)
- ♿ WCAG AAA accessibility
- 🏆 Lighthouse 95+ guaranteed

**Best per**:
- SaaS dashboards
- Landing pages
- User onboarding flows
- Settings pages
- Data tables

---

## 📊 Confronto Features

| Feature | Smile Dev | Smile UX |
|---------|-----------|----------|
| **Focus** | Backend consistency | UI extreme polish |
| **Output** | API, database, auth | Components, pages, design systems |
| **Style** | Rigid code standards | Pixel-perfect design |
| **Testing** | TDD enforced | Lighthouse 95+ |
| **Deliverable** | Production API | User-ready UI |
| **Overnight** | ✅ Yes | ✅ Yes |
| **Caching** | ✅ 90% token saving | ✅ 90% token saving |

---

## 💡 Esempi d'Uso

### Quick Task (Interactive)

**Backend:**
```
Tu: "Smile Dev, add email verification to signup"
Agente: [Si attiva]
Tu: "NO" (Interactive mode)
Agente: "Got it. Let me plan the feature..."
→ Collaborazione iterativa
```

**UI/UX:**
```
Tu: "Smile UX, improve button hover states"
Agente: [Si attiva]
Tu: "NO" (Interactive mode)
Agente: "Let me show you polished hover states..."
→ Design review collaborativo
```

### Overnight Session

**Backend:**
```
Tu: "Smile Dev, build complete payment system with Stripe"
Agente: [Si attiva]
Tu: "YES" (Overnight mode)
Agente: [Lavora 6-8h autonomamente]
→ Mattina: Payment API completa, testata, documentata
```

**UI/UX:**
```
Tu: "Smile UX, create entire landing page (hero, features, pricing, FAQ)"
Agente: [Si attiva]
Tu: "YES" (Overnight mode)
Agente: [Lavora 6-8h autonomamente]
→ Mattina: Landing page pixel-perfect, responsive, Lighthouse 95+
```

---

## 🔄 Workflow Consigliato

### Sviluppo Full-Stack (2 Notti)

**Notte 1: Backend (Smile Dev)**
```bash
22:00 - "Smile Dev, build user authentication + API endpoints"
       → Overnight Mode: YES
06:00 - Backend completo, testato, documentato
```

**Notte 2: Frontend (Smile UX)**
```bash
22:00 - "Smile UX, create dashboard UI consuming yesterday's API"
       → Overnight Mode: YES
06:00 - UI completa, responsive, polished
```

**Risultato**: Full-stack app in 2 notti! 🚀

---

## ⚙️ Configurazione & Setup

### Prerequisiti

**Per Smile Dev:**
- ✅ Git repository inizializzato
- ✅ Overnight-dev plugin attivo
- ✅ Test framework configurato (Jest, pytest, etc.)

**Per Smile UX:**
- ✅ Frontend framework installato (React, Vue, Next.js)
- ✅ Tailwind CSS (o CSS framework)
- ✅ Storybook (opzionale ma consigliato)

### File Struttura

```
.claude/
├── agents/
│   ├── smile-dev.md       ← Backend agent (auto-attivazione)
│   ├── smile-ux.md        ← UI/UX agent (auto-attivazione)
│   └── README.md          ← Questa guida
└── prompts/
    ├── backend-elite-cached.md   ← Masterprompt manuale
    ├── uiux-elite-cached.md      ← Masterprompt manuale
    └── README-CACHING.md         ← Guida caching
```

---

## 🎯 Quando Usare Cosa?

### Usa AGENTI (`.claude/agents/`) quando:
- ✅ Task veloce (1-2 ore)
- ✅ Sviluppo iterativo
- ✅ Vuoi auto-attivazione (scrivi nome)
- ✅ Collaborazione interattiva

### Usa MASTERPROMPT (`.claude/prompts/`) quando:
- 📅 Sessione overnight lunga (6-8h)
- 🎯 Progetto complesso
- 💾 Vuoi controllo totale su quando iniziare
- 📋 Task molto dettagliato con molti requisiti

---

## ❓ FAQ

**Q: Gli agenti si attivano sempre quando scrivo "Smile"?**
A: Sì, menzionare "Smile Dev" o "Smile UX" li attiva automaticamente.

**Q: Posso usare entrambi nella stessa conversazione?**
A: Meglio di no. Usa 1 agente per conversazione per evitare confusione.

**Q: Agenti vs Masterprompt - quale è meglio?**
A: Dipende:
- Quick tasks → Agenti
- Overnight sessions → Masterprompt

**Q: Prompt caching funziona anche con agenti?**
A: SÌ! 90% token saving anche con agenti.

**Q: Posso modificare gli agenti?**
A: Sì, modifica `.claude/agents/smile-dev.md` o `smile-ux.md` come preferisci.

---

## 🚀 Prossimi Passi

1. **Prova Smile Dev**:
   ```
   "Smile Dev, help me build a simple API endpoint"
   ```

2. **Prova Smile UX**:
   ```
   "Smile UX, create a beautiful button component"
   ```

3. **Overnight Session**:
   - Scegli task complesso
   - Attiva agente
   - Rispondi "YES" a Overnight Mode
   - Vai a dormire 💤

Buon coding con Smile Agents! 🎉
