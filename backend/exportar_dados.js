const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "data", "hr_system_v2.sqlite");
const db = new sqlite3.Database(dbPath);

const dados = {};

db.serialize(() => {
  db.all("SELECT * FROM colaboradores", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    dados.colaboradores = rows;

    db.all("SELECT * FROM documentos", (err2, rows2) => {
      if (err2) {
        console.error(err2);
        return;
      }

      dados.documentos = rows2;

      fs.writeFileSync(
        "transferencia_dados.json",
        JSON.stringify(dados, null, 2)
      );

      console.log("✅ Arquivo transferencia_dados.json criado!");
      db.close();
    });
  });
});