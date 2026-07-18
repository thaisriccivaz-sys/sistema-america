const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend', 'server.js');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /from:\s*([`'])"?(?:RH\s*-?\s*América Rental|América Rental\s*RH|America Rental|RH América Rental|RH America Rental(?:\s*\(TESTE\))?|Logística América Rental|América Rental \(Logística\)|Estoque América Rental|Agenda América Rental|Treinamentos América Rental|América Rental Sistema|América Rental Administrativo)"?\s*<([^>]+)>([`'])/gi;

const newContent = content.replace(regex, (match, quoteStart, emailVar, quoteEnd) => {
    return `from: ${quoteStart}"América Rental - Sistema" <${emailVar}>${quoteEnd}`;
});

// Fix hardcoded string concatenations
const regexConcat1 = /from:\s*'"RH America Rental" <'\s*\+\s*SMTP_CONFIG\.auth\.user\s*\+\s*'>'/g;
const newContent2 = newContent.replace(regexConcat1, `from: '"América Rental - Sistema" <' + SMTP_CONFIG.auth.user + '>'`);

const regexConcat2 = /from:\s*'"RH America Rental \(TESTE\)" <'\s*\+\s*SMTP_CONFIG\.auth\.user\s*\+\s*'>'/g;
const newContent3 = newContent2.replace(regexConcat2, `from: '"América Rental - Sistema" <' + SMTP_CONFIG.auth.user + '>'`);

const regexConcat3 = /from:\s*'"América Rental Administrativo" <'\s*\+\s*SMTP_CONFIG\.auth\.user\s*\+\s*'>'/g;
const newContent4 = newContent3.replace(regexConcat3, `from: '"América Rental - Sistema" <' + SMTP_CONFIG.auth.user + '>'`);


fs.writeFileSync(filePath, newContent4);
console.log('Nomes de remetente atualizados com sucesso.');
