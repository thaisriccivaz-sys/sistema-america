const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'backend', 'cid10.min.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const newCIDs = [
    { code: "S62.0", desc: "Fratura do osso navicular [escafóide] da mão" },
    { code: "S62.1", desc: "Fratura de outro(s) osso(s) do carpo" },
    { code: "S62.2", desc: "Fratura do primeiro metacarpiano" },
    { code: "S62.3", desc: "Fratura de outro osso metacarpiano" },
    { code: "S62.4", desc: "Fraturas múltiplas de ossos metacarpianos" },
    { code: "S62.5", desc: "Fratura do polegar" },
    { code: "S62.6", desc: "Fratura de outros dedos" },
    { code: "S62.7", desc: "Fraturas múltiplas dos dedos" },
    { code: "S62.8", desc: "Fratura de outras partes e de partes não especificadas do punho e da mão" },
    { code: "S62.9", desc: "Fratura não especificada do punho e da mão" },
    
    { code: "Z02.7", desc: "Obtenção de atestado médico" },
    { code: "Z76.2", desc: "Consulta para obtenção de atestado médico" }
];

const existingCodes = new Set(data.map(c => c.code));
let added = 0;

newCIDs.forEach(c => {
    if (!existingCodes.has(c.code)) {
        data.push(c);
        added++;
    }
});

data.sort((a, b) => a.code.localeCompare(b.code));
fs.writeFileSync(file, JSON.stringify(data, null, 2));

console.log(`Foram adicionados ${added} novos CIDs ao arquivo.`);
