const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const old = "            hash_assinatura AS hash_pdf,\r\n            NULL AS detalhes\r\n         FROM assinaturas_auditoria\r\n         ORDER BY data_assinatura DESC\r\n         LIMIT 500`";

const newQ = "            hash_assinatura AS hash_pdf,\r\n            pesquisa_respondida_em,\r\n            NULL AS detalhes\r\n         FROM assinaturas_auditoria\r\n         ORDER BY data_assinatura DESC\r\n         LIMIT 500`";

const count = code.split(old).length - 1;
console.log('Occurrences:', count);
if (count === 1) {
  code = code.replace(old, newQ);
  fs.writeFileSync('backend/server.js', code);
  console.log('✅ pesquisa_respondida_em added to audit API query');
} else {
  console.error('❌ Could not find anchor');
}
