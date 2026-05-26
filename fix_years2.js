const fs = require('fs');
let c = fs.readFileSync('frontend/app.js', 'utf8');

const regex = /const d = c\.data_admissao \? new Date\(c\.data_admissao\.includes\('T'\) \? c\.data_admissao : c\.data_admissao \+ 'T12:00:00'\)\.toLocaleDateString\('pt-BR'\) : '-';\r?\n\s*expInfoHtml = `<div style="font-size:0\.95rem; color:#334155; font-weight:500;">\$\{d\}<\/div>`;\r?\n\s*if \(c\.data_admissao\) \{[\s\S]*?expInfoHtml \+= `<div style="font-size:0\.75rem; font-weight:700; margin-top:2px; color: \$\{badgeColor\};">\$\{years\} ano\$\{years > 1 \? 's' : ''\}<\/div>`;\r?\n\s*\}\r?\n\s*\}/g;

const replacement = `const d = c.data_admissao ? new Date(c.data_admissao.includes('T') ? c.data_admissao : c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                        expInfoHtml = \\\`<div style="font-size:0.95rem; color:#334155; font-weight:500;">\\\${d}</div>\\\`;
                        if (c.data_admissao) {
                            const admDate = new Date(c.data_admissao + 'T12:00:00');
                            const today = new Date();
                            if (today >= admDate) {
                                let years = today.getFullYear() - admDate.getFullYear();
                                let months = today.getMonth() - admDate.getMonth();
                                if (today.getDate() < admDate.getDate()) {
                                    months--;
                                }
                                if (months < 0) {
                                    years--;
                                    months += 12;
                                }
                                
                                let badgeColor = '';
                                if (years === 0) badgeColor = '#eab308'; // amarelo
                                else if (years >= 1 && years < 3) badgeColor = '#f97316'; // laranja
                                else if (years >= 3 && years < 5) badgeColor = '#3b82f6'; // azul
                                else if (years >= 5 && years < 10) badgeColor = '#059669'; // verde escuro
                                else if (years >= 10) badgeColor = '#8b5cf6'; // roxo
                                
                                let textPart = [];
                                if (years > 0) textPart.push(\\\`\\\${years} ano\\\${years > 1 ? 's' : ''}\\\`);
                                if (months > 0) textPart.push(\\\`\\\${months} mês\\\${months > 1 ? 'es' : ''}\\\`);
                                
                                if (textPart.length > 0) {
                                    expInfoHtml += \\\`<div style="font-size:0.75rem; font-weight:700; margin-top:2px; color: \\\${badgeColor};">\\\${textPart.join(' e ')}</div>\\\`;
                                } else if (years === 0 && months === 0) {
                                    // acabou de entrar
                                    expInfoHtml += \\\`<div style="font-size:0.75rem; font-weight:700; margin-top:2px; color: \\\${badgeColor};">Menos de 1 mês</div>\\\`;
                                }
                            }
                        }`;

if (regex.test(c)) {
    c = c.replace(regex, replacement.replace(/\\`/g, '`').replace(/\\\$/g, '$'));
    fs.writeFileSync('frontend/app.js', c);
    console.log("Success");
} else {
    console.log("Not found regex");
}
