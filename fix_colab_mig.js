const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

code = code.replace(
    'db.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_salarial TEXT", (err) => {',
    'db.run("ALTER TABLE colaboradores ADD COLUMN habilidades_equipe TEXT", () => {});\n    db.run("ALTER TABLE colaboradores ADD COLUMN adiantamento_salarial TEXT", (err) => {'
);

fs.writeFileSync('backend/server.js', code);
console.log('Fixed backend server migration');
