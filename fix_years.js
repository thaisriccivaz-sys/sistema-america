const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

const target = `const d = c.data_admissao ? new Date(c.data_admissao.includes('T') ? c.data_admissao : c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                        expInfoHtml = \\\`<div style="font-size:0.95rem;">\\\${d}</div>\\\`;`;

const replacement = `const d = c.data_admissao ? new Date(c.data_admissao.includes('T') ? c.data_admissao : c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                        expInfoHtml = \\\`<div style="font-size:0.95rem; color:#334155; font-weight:500;">\\\${d}</div>\\\`;
                        if (c.data_admissao) {
                            const admDate = new Date(c.data_admissao + 'T12:00:00');
                            const today = new Date();
                            let years = today.getFullYear() - admDate.getFullYear();
                            const m = today.getMonth() - admDate.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < admDate.getDate())) {
                                years--;
                            }
                            if (years >= 1) {
                                let badgeColor = '';
                                if (years >= 1 && years < 3) badgeColor = '#10b981'; // verde claro
                                else if (years >= 3 && years < 5) badgeColor = '#3b82f6'; // azul
                                else if (years >= 5 && years < 10) badgeColor = '#059669'; // verde escuro
                                else if (years >= 10) badgeColor = '#8b5cf6'; // roxo
                                
                                expInfoHtml += \\\`<div style="font-size:0.75rem; font-weight:700; margin-top:2px; color: \\\${badgeColor};">\\\${years} ano\\\${years > 1 ? 's' : ''}</div>\\\`;
                            }
                        }`;

// Replace ignoring \r
const regex = /const d = c\.data_admissao \? new Date\(c\.data_admissao\.includes\('T'\) \? c\.data_admissao : c\.data_admissao \+ 'T12:00:00'\)\.toLocaleDateString\('pt-BR'\) : '-';\r?\n\s*expInfoHtml = `<div style="font-size:0\.95rem;">\$\{d\}<\/div>`;/g;

if (regex.test(c)) {
    c = c.replace(regex, replacement.replace(/\\`/g, '`').replace(/\\\$/g, '$'));
    fs.writeFileSync('frontend/app.js', c);
    console.log("Success");
} else {
    console.log("Not found regex");
}
