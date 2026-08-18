const fs = require('fs');
let code = fs.readFileSync('frontend/sac.js', 'utf8');

const target1 = `    async addComment(ticketId) {\r\n      const t = _tickets.find(x => x.id === ticketId);\r\n      if (!t) return;`;
const fix1 = `    async addComment(ticketId) {\r\n      let tLocal = _tickets.find(x => x.id === ticketId);\r\n      if (!tLocal) return;`;

const target1LF = `    async addComment(ticketId) {\n      const t = _tickets.find(x => x.id === ticketId);\n      if (!t) return;`;
const fix1LF = `    async addComment(ticketId) {\n      let tLocal = _tickets.find(x => x.id === ticketId);\n      if (!tLocal) return;`;

if (code.includes(target1)) {
    code = code.replace(target1, fix1);
} else if (code.includes(target1LF)) {
    code = code.replace(target1LF, fix1LF);
}

fs.writeFileSync('frontend/sac.js', code);
console.log('Fixed successfully');
