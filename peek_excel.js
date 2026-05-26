const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/OS_Diurno_ (3).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
console.log("Headers:");
console.log(data[0]);
console.log("Row 1:");
console.log(data[1]);
