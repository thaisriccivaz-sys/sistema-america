const fs = require('fs');
const s = fs.readFileSync('backend/server.js', 'utf8');

const hasMigration = s.includes('ALTER TABLE colaboradores ADD COLUMN santander_ficha_data');
const occurrences = (s.match(/santander_ficha_data/g) || []).length;
const inAllowedCols = s.includes("'santander_ficha_data'");

const lines = s.split('\n');
const migrationLine = lines.findIndex(l => l.includes('ALTER TABLE colaboradores ADD COLUMN santander_ficha_data')) + 1;
const allowedLine = lines.findIndex(l => l.includes("'santander_ficha_data'")) + 1;

console.log('Migration present:', hasMigration, '(line', migrationLine + ')');
console.log('In allowed columns:', inAllowedCols, '(line', allowedLine + ')');
console.log('Total occurrences:', occurrences);

// Show context around migration
if (migrationLine > 0) {
    console.log('\nMigration context:');
    for (let i = Math.max(0, migrationLine - 3); i < migrationLine + 3; i++) {
        console.log(i + 1, '|', lines[i]);
    }
}

// Check if the generic PUT /api/colaboradores/:id also has the column
const putIdx = s.indexOf("app.put('/api/colaboradores/:id'");
if (putIdx !== -1) {
    const putSection = s.substring(putIdx, putIdx + 2000);
    console.log('\nPUT endpoint has santander_ficha_data:', putSection.includes('santander_ficha_data'));
}
