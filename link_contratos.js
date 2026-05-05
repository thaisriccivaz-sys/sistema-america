const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

// Caminhos
const excelPath = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/scp102a1-.xlsx';
const dbPath = 'backend/data/hr_system_v2.sqlite';

// Conectar ao banco de dados
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir banco:', err);
        process.exit(1);
    }
});

// Ler a planilha
const wb = xlsx.readFile(excelPath);
const sheetName = wb.SheetNames[0];
const data = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { raw: false });

console.log(`Planilha lida com sucesso. Total de linhas: ${data.length}`);

let updatedCount = 0;
let pendingCount = 0;

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    data.forEach(row => {
        let osNum = row['OS'] || row['os'] || row['numero_os'];
        let contrato = row['Contrato'] || row['contrato'];

        if (osNum && contrato) {
            osNum = osNum.toString().trim();
            contrato = contrato.toString().trim();
            
            if(contrato !== '') {
                pendingCount++;
                db.run('UPDATE os_logistica SET contrato = ? WHERE numero_os = ?', [contrato, osNum], function(err) {
                    if (err) {
                        console.error(`Erro ao atualizar OS ${osNum}:`, err.message);
                    } else {
                        if (this.changes > 0) {
                            updatedCount += this.changes;
                        }
                    }
                    checkDone();
                });
            }
        }
    });

    db.run('COMMIT');
});

function checkDone() {
    pendingCount--;
    if (pendingCount === 0) {
        console.log(`Atualização finalizada. Total de OS atualizadas: ${updatedCount}`);
        db.close();
    }
}
