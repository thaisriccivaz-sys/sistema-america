const db = require('./backend/database');

const cols = [
    'sla_frozen_at TEXT',
    'sla_elapsed_ms INTEGER',
    'follow_up_deadline TEXT',
    'follow_up_notified INTEGER DEFAULT 0',
    'follow_up_pending_justification INTEGER DEFAULT 0',
    'close_date TEXT'
];

cols.forEach(col => {
    db.run(`ALTER TABLE sac_tickets ADD COLUMN ${col}`, (err) => {
        if (err) {
            if (!err.message.includes('duplicate column name')) {
                console.error(`Error adding ${col}:`, err.message);
            } else {
                console.log(`Column ${col} already exists.`);
            }
        } else {
            console.log(`Added column ${col}`);
        }
    });
});
