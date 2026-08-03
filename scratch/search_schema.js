const fs = require('fs');
const content = fs.readFileSync('frontend/proposta.js', 'utf8');
const lines = content.split('\n');
const targets = ['_limparFormPrecificacaoNovo', '_salvarServicoPrecificacao', '_excluirServicoPrecificacao', '_recarregarServicosPrecificacao'];
lines.forEach((line, idx) => {
  targets.forEach(t => {
    if (line.includes(t)) {
      console.log(`proposta.js:${idx + 1}: ${line.trim()}`);
    }
  });
});
