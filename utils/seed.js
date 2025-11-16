const bcrypt = require('bcryptjs');
const { db, initializeDatabase } = require('../config/database');

console.log('🌱 Avvio seeding database SmileAgent...\n');

// Inizializza schema
initializeDatabase();

// Helper per generare date random
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomPastDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date.toISOString().split('T')[0];
};

const randomFutureDate = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  return date.toISOString().split('T')[0];
};

const randomFutureDateTime = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysAhead));
  const hour = 9 + Math.floor(Math.random() * 8); // 9-17
  const minute = Math.random() > 0.5 ? '00' : '30';
  return `${date.toISOString().split('T')[0]} ${hour}:${minute}:00`;
};

// 1. Crea Studio Demo
console.log('📍 Creazione studio dentistico demo...');
const hashedPassword = bcrypt.hashSync('demo123', 10);

const insertStudio = db.prepare(`
  INSERT INTO studios (nome, email, password, telefono, indirizzo, citta, cap, partita_iva, piano, stato)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const studioResult = insertStudio.run(
  'Studio Dentistico Dr. Rossi & Partners',
  'studio@dentalrossi.it',
  hashedPassword,
  '+39 02 1234567',
  'Via Roma 45',
  'Milano',
  '20121',
  'IT12345678901',
  'professional',
  'attivo'
);

const studioId = studioResult.lastInsertRowid;
console.log(`✅ Studio creato (ID: ${studioId})`);

// 2. Crea Team Members
console.log('\n👥 Creazione team members...');
const teamMembers = [
  { nome: 'Mario', cognome: 'Rossi', email: 'mario.rossi@dentalrossi.it', ruolo: 'Titolare', specializzazione: 'Odontoiatria Generale', telefono: '+39 340 1234567' },
  { nome: 'Laura', cognome: 'Bianchi', email: 'laura.bianchi@dentalrossi.it', ruolo: 'Dentista', specializzazione: 'Ortodonzia', telefono: '+39 340 2345678' },
  { nome: 'Giuseppe', cognome: 'Verdi', email: 'giuseppe.verdi@dentalrossi.it', ruolo: 'Dentista', specializzazione: 'Implantologia', telefono: '+39 340 3456789' },
  { nome: 'Francesca', cognome: 'Neri', email: 'francesca.neri@dentalrossi.it', ruolo: 'Igienista Dentale', specializzazione: 'Igiene e Prevenzione', telefono: '+39 340 4567890' },
  { nome: 'Andrea', cognome: 'Gialli', email: 'andrea.gialli@dentalrossi.it', ruolo: 'Segreteria', specializzazione: null, telefono: '+39 340 5678901' }
];

const insertTeamMember = db.prepare(`
  INSERT INTO team_members (studio_id, nome, cognome, email, ruolo, specializzazione, telefono)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const teamIds = [];
teamMembers.forEach(member => {
  const result = insertTeamMember.run(studioId, member.nome, member.cognome, member.email, member.ruolo, member.specializzazione, member.telefono);
  teamIds.push(result.lastInsertRowid);
});
console.log(`✅ ${teamIds.length} membri del team creati`);

// 3. Crea Pazienti Demo
console.log('\n👤 Creazione pazienti demo...');
const pazienti = [
  { nome: 'Marco', cognome: 'Ferrari', email: 'marco.ferrari@email.it', telefono: '+39 333 1111111', data_nascita: '1985-03-15', citta: 'Milano', note_mediche: 'Allergia alla penicillina' },
  { nome: 'Giulia', cognome: 'Romano', email: 'giulia.romano@email.it', telefono: '+39 333 2222222', data_nascita: '1992-07-22', citta: 'Milano', note_mediche: '' },
  { nome: 'Alessandro', cognome: 'Conti', email: 'alessandro.conti@email.it', telefono: '+39 333 3333333', data_nascita: '1978-11-08', citta: 'Monza', note_mediche: 'Diabete tipo 2' },
  { nome: 'Sofia', cognome: 'Ricci', email: 'sofia.ricci@email.it', telefono: '+39 333 4444444', data_nascita: '2005-02-14', citta: 'Milano', note_mediche: '' },
  { nome: 'Luca', cognome: 'Marino', email: 'luca.marino@email.it', telefono: '+39 333 5555555', data_nascita: '1990-09-30', citta: 'Sesto San Giovanni', note_mediche: '' },
  { nome: 'Chiara', cognome: 'Greco', email: 'chiara.greco@email.it', telefono: '+39 333 6666666', data_nascita: '1988-05-17', citta: 'Milano', note_mediche: 'Gravidanza (secondo trimestre)' },
  { nome: 'Matteo', cognome: 'Bruno', email: 'matteo.bruno@email.it', telefono: '+39 333 7777777', data_nascita: '1995-12-03', citta: 'Rho', note_mediche: '' },
  { nome: 'Elena', cognome: 'Colombo', email: 'elena.colombo@email.it', telefono: '+39 333 8888888', data_nascita: '1982-08-25', citta: 'Milano', note_mediche: 'Cardiopatia' },
  { nome: 'Francesco', cognome: 'Esposito', email: 'francesco.esposito@email.it', telefono: '+39 333 9999999', data_nascita: '1970-04-12', citta: 'Cinisello Balsamo', note_mediche: '' },
  { nome: 'Anna', cognome: 'Barbieri', email: 'anna.barbieri@email.it', telefono: '+39 334 1111111', data_nascita: '1998-01-20', citta: 'Milano', note_mediche: '' }
];

const insertPaziente = db.prepare(`
  INSERT INTO pazienti (studio_id, nome, cognome, email, telefono, data_nascita, citta, cap, note_mediche, consenso_privacy, consenso_marketing, data_prima_visita)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
`);

const pazienteIds = [];
pazienti.forEach(p => {
  const result = insertPaziente.run(
    studioId, p.nome, p.cognome, p.email, p.telefono, p.data_nascita, p.citta, '20100', p.note_mediche,
    Math.random() > 0.5 ? 1 : 0,
    randomPastDate(365)
  );
  pazienteIds.push(result.lastInsertRowid);
});
console.log(`✅ ${pazienteIds.length} pazienti creati`);

// 4. Crea Appuntamenti
console.log('\n📅 Creazione appuntamenti...');
const tipiTrattamento = [
  'Visita di controllo', 'Igiene dentale', 'Otturazione', 'Devitalizzazione',
  'Estrazione', 'Impianto', 'Ortodonzia', 'Sbiancamento', 'Protesi', 'Urgenza'
];

const insertAppuntamento = db.prepare(`
  INSERT INTO appuntamenti (studio_id, paziente_id, dentista_id, data_ora, durata_minuti, tipo_trattamento, stato, note)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let appCount = 0;
// Appuntamenti passati
for (let i = 0; i < 15; i++) {
  const pazId = pazienteIds[Math.floor(Math.random() * pazienteIds.length)];
  const dentId = teamIds[Math.floor(Math.random() * 3)]; // Solo dentisti
  const tipo = tipiTrattamento[Math.floor(Math.random() * tipiTrattamento.length)];
  const durata = tipo === 'Visita di controllo' ? 30 : tipo === 'Igiene dentale' ? 45 : 60;

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 60));
  const dateTime = `${pastDate.toISOString().split('T')[0]} ${9 + Math.floor(Math.random() * 8)}:00:00`;

  insertAppuntamento.run(studioId, pazId, dentId, dateTime, durata, tipo, 'completato', '');
  appCount++;
}

// Appuntamenti futuri
for (let i = 0; i < 20; i++) {
  const pazId = pazienteIds[Math.floor(Math.random() * pazienteIds.length)];
  const dentId = teamIds[Math.floor(Math.random() * 3)];
  const tipo = tipiTrattamento[Math.floor(Math.random() * tipiTrattamento.length)];
  const durata = tipo === 'Visita di controllo' ? 30 : tipo === 'Igiene dentale' ? 45 : 60;

  insertAppuntamento.run(studioId, pazId, dentId, randomFutureDateTime(30), durata, tipo, 'confermato', '');
  appCount++;
}

console.log(`✅ ${appCount} appuntamenti creati`);

// 5. Crea Trattamenti
console.log('\n🦷 Creazione trattamenti...');
const trattamentiData = [
  { nome: 'Otturazione molare', descrizione: 'Otturazione composito dente 36', dente: '36', costo: 150.00 },
  { nome: 'Devitalizzazione', descrizione: 'Trattamento endodontico dente 46', dente: '46', costo: 450.00 },
  { nome: 'Igiene professionale', descrizione: 'Detartrasi e lucidatura', dente: null, costo: 80.00 },
  { nome: 'Impianto dentale', descrizione: 'Impianto singolo con corona', dente: '16', costo: 1800.00 },
  { nome: 'Estrazione', descrizione: 'Estrazione semplice dente 48', dente: '48', costo: 120.00 }
];

const insertTrattamento = db.prepare(`
  INSERT INTO trattamenti (studio_id, paziente_id, dentista_id, nome, descrizione, dente, costo, stato, data_esecuzione)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 0; i < 25; i++) {
  const pazId = pazienteIds[Math.floor(Math.random() * pazienteIds.length)];
  const dentId = teamIds[Math.floor(Math.random() * 3)];
  const tratt = trattamentiData[Math.floor(Math.random() * trattamentiData.length)];
  const stato = Math.random() > 0.3 ? 'completato' : 'pianificato';

  insertTrattamento.run(
    studioId, pazId, dentId, tratt.nome, tratt.descrizione, tratt.dente, tratt.costo, stato,
    stato === 'completato' ? randomPastDate(90) : null
  );
}
console.log('✅ 25 trattamenti creati');

// 6. Crea Fatture
console.log('\n💶 Creazione fatture...');
const insertFattura = db.prepare(`
  INSERT INTO fatture (studio_id, paziente_id, numero_fattura, data_emissione, importo, iva, totale, stato, data_pagamento, metodo_pagamento)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let i = 1; i <= 15; i++) {
  const pazId = pazienteIds[Math.floor(Math.random() * pazienteIds.length)];
  const importo = 100 + Math.floor(Math.random() * 1500);
  const iva = importo * 0.22;
  const totale = importo + iva;
  const stato = Math.random() > 0.2 ? 'pagata' : 'da_pagare';
  const dataEmissione = randomPastDate(180);

  insertFattura.run(
    studioId, pazId, `2025/${String(i).padStart(4, '0')}`, dataEmissione, importo, iva, totale, stato,
    stato === 'pagata' ? randomPastDate(170) : null,
    stato === 'pagata' ? (Math.random() > 0.5 ? 'Carta' : 'Bonifico') : null
  );
}
console.log('✅ 15 fatture create');

// 7. Crea Messaggi
console.log('\n💬 Creazione messaggi demo...');
const insertMessaggio = db.prepare(`
  INSERT INTO messaggi (studio_id, paziente_id, tipo, canale, destinatario, oggetto, contenuto, stato, data_invio)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const messaggiDemo = [
  { tipo: 'promemoria', canale: 'email', oggetto: 'Promemoria appuntamento', contenuto: 'Gentile paziente, le ricordiamo il suo appuntamento di domani alle ore 10:00.' },
  { tipo: 'marketing', canale: 'whatsapp', oggetto: 'Offerta sbiancamento', contenuto: 'Approfitta della nostra promozione sbiancamento dentale!' },
  { tipo: 'follow_up', canale: 'sms', oggetto: 'Come sta?', contenuto: 'Buongiorno, come si sente dopo il trattamento di ieri?' }
];

for (let i = 0; i < 20; i++) {
  const pazId = pazienteIds[Math.floor(Math.random() * pazienteIds.length)];
  const msg = messaggiDemo[Math.floor(Math.random() * messaggiDemo.length)];
  const stato = Math.random() > 0.3 ? 'inviato' : 'bozza';

  const paziente = db.prepare('SELECT email FROM pazienti WHERE id = ?').get(pazId);

  insertMessaggio.run(
    studioId, pazId, msg.tipo, msg.canale, paziente.email, msg.oggetto, msg.contenuto, stato,
    stato === 'inviato' ? randomPastDate(30) : null
  );
}
console.log('✅ 20 messaggi creati');

// 8. Crea Social Posts
console.log('\n📱 Creazione post social media...');
const insertSocialPost = db.prepare(`
  INSERT INTO social_posts (studio_id, piattaforma, contenuto, stato, data_programmata, data_pubblicazione, engagement)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const socialContents = [
  { piattaforma: 'Instagram', contenuto: '🦷 Mantieni il tuo sorriso sano! Ricorda di lavarti i denti almeno 2 volte al giorno. #SorrisoSano #IgieneDentale #Milano' },
  { piattaforma: 'Facebook', contenuto: 'Sapevi che una corretta igiene orale può prevenire molte malattie? Prenota la tua visita di controllo! 😊' },
  { piattaforma: 'Instagram', contenuto: '✨ Sbiancamento professionale: risultati visibili in una sola seduta! Contattaci per info #SbbiancamentoDenti #SmileMakeover' },
  { piattaforma: 'LinkedIn', contenuto: 'La salute orale è fondamentale per il benessere generale. Scopri i nostri servizi di odontoiatria preventiva.' }
];

for (let i = 0; i < 12; i++) {
  const post = socialContents[Math.floor(Math.random() * socialContents.length)];
  const stato = Math.random() > 0.4 ? 'pubblicato' : 'programmato';

  insertSocialPost.run(
    studioId, post.piattaforma, post.contenuto, stato,
    stato === 'programmato' ? randomFutureDateTime(14) : null,
    stato === 'pubblicato' ? randomPastDate(30) : null,
    stato === 'pubblicato' ? Math.floor(Math.random() * 200) : 0
  );
}
console.log('✅ 12 post social media creati');

// 9. Crea Conversazioni Chat AI
console.log('\n🤖 Creazione conversazioni AI demo...');
const insertConversazione = db.prepare(`
  INSERT INTO chat_conversazioni (studio_id, titolo, tipo, data_creazione, ultima_attivita)
  VALUES (?, ?, ?, ?, ?)
`);

const insertChatMsg = db.prepare(`
  INSERT INTO chat_messaggi (conversazione_id, ruolo, contenuto, timestamp, tokens_usati)
  VALUES (?, ?, ?, ?, ?)
`);

const conversazioni = [
  {
    titolo: 'Gestione carie profonde',
    tipo: 'clinica',
    messaggi: [
      { ruolo: 'user', contenuto: 'Come gestisci una carie profonda che si avvicina alla polpa?' },
      { ruolo: 'assistant', contenuto: 'Per gestire una carie profonda prossima alla polpa, ecco l\'approccio consigliato:\n\n1. **Valutazione radiografica**: RX endorale per valutare l\'estensione\n2. **Rimozione carie**: Procedere con cautela, possibilmente sotto diga\n3. **Protezione pulpare**: Se esposizione minima, considera IPC (Incappucciamento Pulpare Diretto)\n4. **Materiali**: Idrossido di calcio o MTA per protezione pulpare\n5. **Monitoraggio**: Test vitalità pulpare e controlli a 3-6 mesi\n\nSe sintomatologia acuta o esposizione importante, valuta trattamento endodontico.' }
    ]
  },
  {
    titolo: 'Marketing per nuovi pazienti',
    tipo: 'business',
    messaggi: [
      { ruolo: 'user', contenuto: 'Quali strategie di marketing consigli per attrarre nuovi pazienti?' },
      { ruolo: 'assistant', contenuto: 'Ecco le strategie più efficaci per studi dentistici in Italia:\n\n**Digital Marketing:**\n- Google My Business ottimizzato\n- SEO locale (es. "dentista Milano centro")\n- Social media (Instagram, Facebook) con contenuti educativi\n- Recensioni online (Google, Pagine Gialle)\n\n**Marketing Tradizionale:**\n- Passaparola (referral program per pazienti attuali)\n- Partnership con farmacie locali\n- Open day e giornate di prevenzione\n\n**Retention:**\n- Sistema di recall automatico\n- Newsletter con consigli salute orale\n- Programmi fedeltà\n\nRicorda: marketing etico, no offerte aggressive, conformità codice deontologico.' }
    ]
  }
];

conversazioni.forEach(conv => {
  const convResult = insertConversazione.run(studioId, conv.titolo, conv.tipo, new Date().toISOString(), new Date().toISOString());
  const convId = convResult.lastInsertRowid;

  conv.messaggi.forEach((msg, idx) => {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() + idx);
    insertChatMsg.run(convId, msg.ruolo, msg.contenuto, timestamp.toISOString(), msg.ruolo === 'assistant' ? 250 : 50);
  });
});

console.log('✅ 2 conversazioni AI create con messaggi');

// 10. Crea Knowledge Base
console.log('\n📚 Creazione knowledge base...');
const insertKnowledge = db.prepare(`
  INSERT INTO knowledge_base (studio_id, categoria, titolo, contenuto, tags, attivo)
  VALUES (?, ?, ?, ?, ?, 1)
`);

const knowledgeItems = [
  {
    categoria: 'Protocolli',
    titolo: 'Protocollo Igiene Strumenti',
    contenuto: 'Procedura standardizzata per sterilizzazione strumenti:\n1. Pre-lavaggio\n2. Detersione ultrasuoni\n3. Asciugatura\n4. Imbustamento\n5. Sterilizzazione autoclave 134°C\n6. Tracciabilità',
    tags: 'igiene,sterilizzazione,sicurezza'
  },
  {
    categoria: 'Trattamenti',
    titolo: 'Piano Cura Implantologia',
    contenuto: 'Fasi standard trattamento implantare:\n1. Valutazione 3D (CBCT)\n2. Chirurgia implantare\n3. Osteointegrazione (3-6 mesi)\n4. Impronta e protesi\n5. Follow-up annuale',
    tags: 'implantologia,chirurgia,protesi'
  },
  {
    categoria: 'Normative',
    titolo: 'GDPR - Gestione Dati Pazienti',
    contenuto: 'Obblighi GDPR per studi dentistici:\n- Consenso informato scritto\n- Registro trattamenti\n- Misure sicurezza dati\n- Nomina DPO se necessario\n- Conservazione cartelle 10 anni (penale) / illimitata (civile)',
    tags: 'gdpr,privacy,normativa'
  }
];

knowledgeItems.forEach(item => {
  insertKnowledge.run(studioId, item.categoria, item.titolo, item.contenuto, item.tags);
});

console.log('✅ 3 documenti knowledge base creati');

console.log('\n🎉 Seeding completato con successo!\n');
console.log('📊 Riepilogo:');
console.log(`   - 1 Studio dentistico`);
console.log(`   - ${teamIds.length} membri del team`);
console.log(`   - ${pazienteIds.length} pazienti`);
console.log(`   - ${appCount} appuntamenti`);
console.log(`   - 25 trattamenti`);
console.log(`   - 15 fatture`);
console.log(`   - 20 messaggi`);
console.log(`   - 12 post social`);
console.log(`   - 2 conversazioni AI`);
console.log(`   - 3 documenti knowledge base`);
console.log('\n🔑 Credenziali accesso:');
console.log('   Email: studio@dentalrossi.it');
console.log('   Password: demo123');
console.log('\n✅ Database pronto per il testing!');

db.close();
