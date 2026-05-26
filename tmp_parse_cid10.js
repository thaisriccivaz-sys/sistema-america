const fs = require('fs');

const raw = fs.readFileSync('./tmp_cid10_completo.txt', 'utf8');
const systemData = JSON.parse(fs.readFileSync('./backend/cid10.min.json', 'utf8').replace(/^\uFEFF/, ''));
const systemMap = new Map(systemData.map(c => [c.code, c.desc]));

const results = new Map();

// Separador: 3 espaços entre CÓDIGO e descrição
const re = /([A-Z]\d{2}(?:\.\d{1,2})?)\s{3}(.*?)(?=\s[A-Z]\d{2}(?:\.\d{1,2})?\s{3}|$)/g;

// Padrões de "ruído" que aparecem em rodapés/cabeçalhos de página do PDF
const noisePatterns = [
  /Versão \d{4}.*/i,
  /Sergipe.*/i,
  /Código\s+Descrição.*/i,
  /Classifica.*/i,
  /Ministério da Saúde.*/i,
  /www\.datasus.*/i,
  /Para mais informações.*/i,
  /CID 10.*/i,
];

function cleanDesc(desc) {
  // Restaurar "fi" ligatura partida pelo PDF
  let d = desc
    .replace(/\u0000/g, 'fi')
    .replace(/\s*fi\s+cad/g, 'ficad')
    .replace(/\s*fi\s+ci/g, 'fici')
    .replace(/\s*fi\s+ca/g, 'fica')
    .replace(/\s*fi\s+co/g, 'fico')
    .replace(/\s*fi\s+ni/g, 'fini')
    .replace(/\s*fi\s+na/g, 'fina')
    .replace(/\s*fi\s+ne/g, 'fine')
    .replace(/\s*fi\s+no/g, 'fino')
    .replace(/\s*fi\s+xe/g, 'fixe')
    .replace(/\s+/g, ' ')
    .trim();

  // Remover ruído de rodapé que aparece junto com a última entrada de uma página
  for (const p of noisePatterns) {
    d = d.replace(p, '').trim();
  }

  return d;
}

for (const line of raw.split('\n')) {
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(line)) !== null) {
    const code = m[1].trim();
    const desc = cleanDesc(m[2]);

    if (
      desc.length > 4 &&
      !desc.startsWith('Código') &&
      !desc.startsWith('Versão') &&
      !desc.startsWith('Sergipe') &&
      !/^\d/.test(desc)
    ) {
      if (!results.has(code)) {
        results.set(code, desc);
      }
    }
  }
}

console.log('CIDs extraídos do PDF:', results.size);
console.log('CIDs no sistema:', systemMap.size);

// Faltantes
const missing = [];
for (const [code, desc] of results) {
  if (!systemMap.has(code)) {
    missing.push({ code, desc });
  }
}
missing.sort((a, b) => a.code.localeCompare(b.code));

console.log('Faltantes no sistema:', missing.length);
console.log('\nAmostra (primeiros 20):');
missing.slice(0, 20).forEach(e => console.log(`  ${e.code}: ${e.desc}`));

// === INSERIR NO ARQUIVO ===
console.log('\n--- Inserindo no cid10.min.json ---');
let data = [...systemData];
const existentes = new Set(data.map(c => c.code));
let adicionados = 0;

for (const { code, desc } of missing) {
  if (!existentes.has(code)) {
    data.push({ code, desc });
    existentes.add(code);
    adicionados++;
  }
}

data.sort((a, b) => a.code.localeCompare(b.code));
fs.writeFileSync('./backend/cid10.min.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`\n✅ Adicionados: ${adicionados} CIDs`);
console.log(`✅ Total no arquivo agora: ${data.length}`);
