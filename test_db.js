const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.get('SELECT payload_json FROM mtr_local WHERE numero_mtr = "260011827085"', (err, row) => {
    if(row) {
        let payload = row.payload_json;
        if(payload.length > 500) {
            console.log(payload.substring(0, 300) + '... (TRUNCATED)');
        } else {
            console.log(payload);
        }
    }
});
