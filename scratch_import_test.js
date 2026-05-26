const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');
const xlsx = require('xlsx');

const file = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/OS_Noturno_ (1).xlsx';
const data = xlsx.utils.sheet_to_json(xlsx.readFile(file).Sheets['OS']);

const uniqueMap = {};
data.forEach(r => {
    const id = String(r['Identificação de referência']).trim();
    if (!uniqueMap[id]) uniqueMap[id] = [];
    uniqueMap[id].push(r);
});

let c = 0;
for (const id in uniqueMap) {
    c++;
}
console.log('Loop count:', c);
