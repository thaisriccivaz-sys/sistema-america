const fs = require('fs');
let s = fs.readFileSync('backend/server.js', 'utf8');

const lines = s.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('motivo = \\'Aus') && lines[i].includes('Agenda\\'; }')) {
        lines[i] = lines[i].replace(/motivo = 'Aus[^']*'; \}/, "motivo = 'Ausência lançada na Agenda'; }");
    }
    if (lines[i].includes('motivo = \\'F') && lines[i].includes('Agenda Log')) {
        lines[i] = lines[i].replace(/motivo = 'F[^']*'; \}/, "motivo = 'Férias lançadas na Agenda Logística'; }");
    }
}
s = lines.join('\n');
fs.writeFileSync('backend/server.js', s, 'utf8');
console.log('Fixed agenda lines');
