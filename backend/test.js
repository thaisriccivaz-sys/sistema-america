const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.get("SELECT id, protocol, commercial_task FROM sac_tickets WHERE protocol = '0003'", (err, row) => console.log(row));
