const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const chatRoutes = require('./routes/chat');
const appRoutes = require('./routes/app');
const analisiRoutes = require('./routes/analisi');
const calendarioRoutes = require('./routes/calendario');
const pazientiRoutes = require('./routes/pazienti');
const messaggiRoutes = require('./routes/messaggi');
const socialRoutes = require('./routes/social');
const analyticsRoutes = require('./routes/analytics');
const impostazioniRoutes = require('./routes/impostazioni');

const app = express();
const PORT = process.env.PORT || 3000;

// Inizializza database
initializeDatabase();

// Auto-seed se database vuoto (primo avvio)
const db = require('./config/database').db;
try {
  const studioCount = db.prepare('SELECT COUNT(*) as count FROM studios').get();
  if (studioCount.count === 0) {
    console.log('🌱 Database vuoto - esecuzione seed automatico...');
    require('./utils/seed');
    console.log('✅ Seed completato! Credenziali: studio@dentalrossi.it / demo123');
  } else {
    console.log(`✅ Database già popolato (${studioCount.count} studi trovati)`);
  }
} catch (error) {
  console.error('⚠️ Errore controllo/seed database:', error.message);
}

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'smileagent-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 giorni
    httpOnly: true
  }
}));

// Routes
app.get('/', (req, res) => {
  if (req.session && req.session.studioId) {
    return res.redirect('/dashboard');
  }
  res.render('pages/landing', { title: 'SmileAgent - SaaS AI per Dentisti' });
});

app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', chatRoutes);
app.use('/', analisiRoutes);
app.use('/', calendarioRoutes);
app.use('/', pazientiRoutes);
app.use('/', messaggiRoutes);
app.use('/', socialRoutes);
app.use('/', analyticsRoutes);
app.use('/', impostazioniRoutes);
app.use('/', appRoutes);

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404 - Pagina non trovata' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Errore server:', err);
  res.status(500).render('pages/error', {
    title: 'Errore - SmileAgent',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Si è verificato un errore'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🦷 ========================================');
  console.log('   SmileAgent - SaaS AI per Dentisti');
  console.log('========================================== 🦷');
  console.log('');
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
  console.log('');
  console.log('📚 Credenziali demo:');
  console.log('   Email: studio@dentalrossi.it');
  console.log('   Password: demo123');
  console.log('');
  console.log('🚀 Pronto per il testing!');
  console.log('');
});

module.exports = app;
