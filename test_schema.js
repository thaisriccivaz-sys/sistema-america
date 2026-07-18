const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
db.all("SELECT * FROM treinamentos;", (err, rows) => {
  console.log(rows);
  db.close();
});
