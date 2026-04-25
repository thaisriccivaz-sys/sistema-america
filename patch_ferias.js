const fs = require('fs');
let js = fs.readFileSync('backend/server.js', 'utf8');

const target = `const concessivoEnd = new Date(adm + 'T12:00:00');
                     concessivoEnd.setFullYear(concessivoEnd.getFullYear() + 2);
                     
                     const diffDays = Math.ceil((concessivoEnd - today) / (1000 * 60 * 60 * 24));
                     return {
                         id: r.id, 
                         nome: r.nome,
                         admissao: adm,
                         concessivo_fim: concessivoEnd.toISOString().split('T')[0],
                         dias_restantes: diffDays
                     };
                 }).filter(r => r.dias_restantes >= 0 && r.dias_restantes <= 60)`;

const replace = `const concessivoEnd = new Date(adm + 'T12:00:00');
                     if (isNaN(concessivoEnd.valueOf())) return null;
                     concessivoEnd.setFullYear(concessivoEnd.getFullYear() + 2);
                     
                     const diffDays = Math.ceil((concessivoEnd - today) / (1000 * 60 * 60 * 24));
                     return {
                         id: r.id, 
                         nome: r.nome,
                         admissao: adm,
                         concessivo_fim: concessivoEnd.toISOString().split('T')[0],
                         dias_restantes: diffDays
                     };
                 }).filter(r => r && r.dias_restantes >= 0 && r.dias_restantes <= 60)`;

js = js.replace(target, replace);
fs.writeFileSync('backend/server.js', js, 'utf8');
