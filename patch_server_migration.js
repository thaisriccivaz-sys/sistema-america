const fs = require('fs');

let js = fs.readFileSync('backend/server.js', 'utf8');

// The startup DB scripts usually run near the bottom or top.
// We can just append a schema migration at the end of the file.

const migrationScript = `
// =====================================================================
// AUTO-MIGRATION PARA CREDENCIAMENTOS COMERCIAL
// =====================================================================
db.serialize(() => {
    const columns = [
        "ALTER TABLE credenciamentos ADD COLUMN licencas_ids TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN endereco_instalacao TEXT;",
        "ALTER TABLE credenciamentos ADD COLUMN acessado_em DATETIME;",
        "ALTER TABLE credenciamentos ADD COLUMN status TEXT DEFAULT 'enviado';",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_colaboradores INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN qtd_max_veiculos INTEGER DEFAULT 0;",
        "ALTER TABLE credenciamentos ADD COLUMN data_limite_envio DATETIME;"
    ];

    columns.forEach(query => {
        db.run(query, (err) => {
            if (err) {
                // Ignore duplicate column errors
            } else {
                console.log("Coluna adicionada em prod:", query);
            }
        });
    });

    db.run("UPDATE credenciamentos SET status = 'enviado' WHERE status IS NULL", (err) => {});
});
`;

if (!js.includes('AUTO-MIGRATION PARA CREDENCIAMENTOS COMERCIAL')) {
    // Append to the file just before the `app.listen` or just at the end
    js += '\n' + migrationScript;
    fs.writeFileSync('backend/server.js', js, 'utf8');
    console.log('server.js patched with auto-migration');
}
