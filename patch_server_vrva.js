const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// Step 1: Add folha_vr/va to migration array
const oldMig = `    'folha_plr', 'folha_plr_valor', 'folha_plr_meses',\r\n    'academia_desconto_valor'\r\n].forEach((col) => {`;
const newMig = `    'folha_plr', 'folha_plr_valor', 'folha_plr_meses',\r\n    'academia_desconto_valor',\r\n    'folha_vr', 'folha_vr_valor',\r\n    'folha_va', 'folha_va_valor'\r\n].forEach((col) => {`;
c = c.replace(oldMig, newMig);

// Step 2: Update the INTEGER DEFAULT 0 check to include folha_vr and folha_va
c = c.replace(
  "if (['folha_periculosidade','folha_insalubridade','folha_mensalidade_sindical','folha_plr'].includes(col)) def = 'INTEGER DEFAULT 0';",
  "if (['folha_periculosidade','folha_insalubridade','folha_mensalidade_sindical','folha_plr','folha_vr','folha_va'].includes(col)) def = 'INTEGER DEFAULT 0';"
);

// Step 3: Update the REAL DEFAULT 0 check to include folha_vr_valor and folha_va_valor
c = c.replace(
  "else if (['folha_periculosidade_valor','folha_mensalidade_sindical_valor','folha_pensao_pct','folha_plr_valor','academia_desconto_valor'].includes(col)) def = 'REAL DEFAULT 0';",
  "else if (['folha_periculosidade_valor','folha_mensalidade_sindical_valor','folha_pensao_pct','folha_plr_valor','academia_desconto_valor','folha_vr_valor','folha_va_valor'].includes(col)) def = 'REAL DEFAULT 0';"
);

fs.writeFileSync('backend/server.js', c, 'utf8');
console.log('server.js migration updated');
