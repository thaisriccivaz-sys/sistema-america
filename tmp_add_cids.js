const fs = require('fs');

const file = './backend/cid10.min.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

const novos = [
  { code: "A27",   desc: "Leptospirose" },
  { code: "A27.0", desc: "Leptospirose icterohemorrágica" },
  { code: "A27.8", desc: "Outras formas de leptospirose" },
  { code: "A27.9", desc: "Leptospirose não especificada" },
  { code: "B55",   desc: "Leishmaniose" },
  { code: "B55.0", desc: "Leishmaniose visceral" },
  { code: "B55.1", desc: "Leishmaniose cutânea" },
  { code: "B55.2", desc: "Leishmaniose cutâneo-mucosa" },
  { code: "B55.9", desc: "Leishmaniose não especificada" }
];

const existentes = new Set(data.map(c => c.code));
let adicionados = 0;

novos.forEach(c => {
  if (!existentes.has(c.code)) {
    data.push(c);
    adicionados++;
    console.log(`✅ Adicionado: ${c.code} — ${c.desc}`);
  } else {
    console.log(`⏭️  Já existe: ${c.code}`);
  }
});

data.sort((a, b) => a.code.localeCompare(b.code));
fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

console.log(`\nTotal adicionado: ${adicionados} | Total no arquivo: ${data.length}`);
