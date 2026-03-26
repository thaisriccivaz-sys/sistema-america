const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'backend', 'hr_system_v2.sqlite'));

const PREFIXO_ANTIGO = 'C:\\A\\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\\Documentos - America Rental\\Diretoria\\Teste Sistema\\colaboradores\\';
const PREFIXO_NOVO = 'data/colaboradores/';

db.serialize(() => {

  db.all("SELECT id, file_path FROM documentos", (err, rows) => {

    if (err) {
      console.error(err);
      return;
    }

    rows.forEach(row => {

      if (row.file_path && row.file_path.includes(PREFIXO_ANTIGO)) {

        const novoCaminho = row.file_path
          .replace(PREFIXO_ANTIGO, PREFIXO_NOVO)
          .replace(/\\/g, '/');

        db.run(
          "UPDATE documentos SET file_path = ? WHERE id = ?",
          [novoCaminho, row.id]
        );

        console.log("Atualizado:", novoCaminho);
      }

    });

    console.log("Migração concluída com sucesso!");

  });

});