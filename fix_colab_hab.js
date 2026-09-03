const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

if (!code.includes('habilidades_equipe TEXT')) {
    code = code.replace(
        /db\.run\("ALTER TABLE colaboradores ADD COLUMN pix_tipo TEXT", \(\) => \{\}\);/,
        'db.run("ALTER TABLE colaboradores ADD COLUMN pix_tipo TEXT", () => {});\n        db.run("ALTER TABLE colaboradores ADD COLUMN habilidades_equipe TEXT", () => {});'
    );
}

if (!code.includes('c.destaque_equipe, c.habilidades_equipe')) {
    code = code.replace(
        /c\.escala_ciclo_inicio, c\.horario_entrada, c\.horario_saida, c\.destaque_equipe/g,
        'c.escala_ciclo_inicio, c.horario_entrada, c.horario_saida, c.destaque_equipe, c.habilidades_equipe'
    );
}

fs.writeFileSync('backend/server.js', code);
console.log('Fixed backend server');
