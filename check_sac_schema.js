const db = require('./backend/database');
db.all("PRAGMA table_info(sac_tickets)", [], (err, rows) => {
    if (err) console.error(err);
    else console.log(rows.map(r => r.name).join(', '));
});
