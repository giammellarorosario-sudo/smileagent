const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/smileagent.db');
const db = new Database(dbPath);

console.log('🔧 Migrating database schema...\n');

try {
  // Aggiungi colonne mancanti a pazienti
  const colsToAdd = [
    'ALTER TABLE pazienti ADD COLUMN sesso TEXT',
    'ALTER TABLE pazienti ADD COLUMN stato TEXT DEFAULT "attivo"',
    'ALTER TABLE pazienti ADD COLUMN data_ultima_visita DATE',
    'ALTER TABLE pazienti ADD COLUMN data_registrazione DATETIME DEFAULT CURRENT_TIMESTAMP',
    'ALTER TABLE pazienti ADD COLUMN note TEXT'
  ];

  colsToAdd.forEach(sql => {
    try {
      db.exec(sql);
      console.log('✅', sql);
    } catch (e) {
      if (e.message.includes('duplicate column')) {
        console.log('⏭️  Column already exists:', sql.split('ADD COLUMN ')[1]);
      } else {
        console.log('❌', sql, '-', e.message);
      }
    }
  });

  console.log('\n✅ Migration completed!');
  db.close();
} catch (error) {
  console.error('❌ Migration failed:', error);
  db.close();
  process.exit(1);
}
