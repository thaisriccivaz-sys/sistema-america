const fs = require('fs');
let c = fs.readFileSync('frontend/fechamento.js', 'utf8');
c = c.replace(/\$\{inpValor\(idx,'adicional_noturno',row.adicional_noturno\|\|0\)\}/g, "${inpNum(idx,'adicional_noturno',row.adicional_noturno||0,'','0.01')}");
fs.writeFileSync('frontend/fechamento.js', c, 'utf8');
