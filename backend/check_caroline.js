const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

// Check caroline's commercial task assignments
const rows = db.prepare(
    "SELECT id, client_name, stage, commercial_task FROM sac_tickets WHERE commercial_task IS NOT NULL AND commercial_task != 'null' ORDER BY created_at DESC LIMIT 20"
).all();

console.log('=== SAC Tickets com commercial_task ===');
rows.forEach(r => {
    try {
        const t = JSON.parse(r.commercial_task);
        if (t) {
            console.log(`ID: ${r.id} | ${r.client_name} | stage: ${r.stage}`);
            console.log(`  assignedTo: "${t.assignedTo}" | assignedToName: "${t.assignedToName}"`);
        }
    } catch(e) {}
});

// Check caroline's user record
const caroline = db.prepare("SELECT id, username, nome, departamento FROM usuarios WHERE username = 'caroline.comercial'").get();
console.log('\n=== Usuario caroline.comercial ===');
console.log(caroline);

db.close();
