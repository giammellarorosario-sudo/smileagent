const Database = require('better-sqlite3');
const db = new Database('./data/smileagent.db');

const analisi = db.prepare(`
  SELECT id, score_salute, report_json, problemi_rilevati, trattamenti_suggeriti
  FROM analisi_radiografiche
  ORDER BY id DESC
  LIMIT 1
`).get();

if (!analisi) {
  console.log('Nessuna analisi trovata nel database');
  db.close();
  process.exit(0);
}

console.log('=== ANALISI #' + analisi.id + ' ===\n');
console.log('Score:', analisi.score_salute);
console.log('\n=== REPORT JSON ===');
console.log(analisi.report_json);
console.log('\n=== PROBLEMI ===');
console.log(analisi.problemi_rilevati);
console.log('\n=== TRATTAMENTI ===');
console.log(analisi.trattamenti_suggeriti);

db.close();
