const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Route placeholder per sezioni non ancora implementate
router.get('/calendario', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Calendario - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'calendario',
    sectionTitle: 'Calendario Appuntamenti',
    sectionIcon: 'calendar_month',
    sectionDescription: 'Gestione completa del calendario con drag & drop, promemoria automatici e sincronizzazione Google Calendar.'
  });
});

router.get('/pazienti', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Pazienti - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'pazienti',
    sectionTitle: 'Gestione Pazienti',
    sectionIcon: 'group',
    sectionDescription: 'Anagrafica completa, storico trattamenti, piani di cura, documenti e comunicazioni con i pazienti.'
  });
});

router.get('/messaggi', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Messaggi - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'messaggi',
    sectionTitle: 'Sistema Messaggistica',
    sectionIcon: 'chat_bubble',
    sectionDescription: 'Invio automatico di promemoria via email, SMS e WhatsApp. Gestione campagne di recall e follow-up.'
  });
});

router.get('/social', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Social Media - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'social',
    sectionTitle: 'Social Media AI',
    sectionIcon: 'public',
    sectionDescription: 'Generazione automatica di post professionali con AI, programmazione pubblicazioni e analisi engagement.'
  });
});

router.get('/analytics', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Analytics - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'analytics',
    sectionTitle: 'Analytics & Report',
    sectionIcon: 'bar_chart',
    sectionDescription: 'Dashboard avanzate con KPI, grafici interattivi, export PDF e comparazione periodi.'
  });
});

router.get('/impostazioni', isAuthenticated, (req, res) => {
  res.render('pages/placeholder', {
    title: 'Impostazioni - SmileAgent',
    studioNome: req.session.studioNome,
    currentPage: 'impostazioni',
    sectionTitle: 'Impostazioni Studio',
    sectionIcon: 'settings',
    sectionDescription: 'Configurazione studio, team members, integrazioni, fatturazione e preferenze sistema.'
  });
});

module.exports = router;
