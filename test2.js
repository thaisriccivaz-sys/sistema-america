const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('./backend/database.sqlite'); db.all($q, function(err, rows) { console.log(JSON.stringify(rows, null, 2)); db.close(); });
