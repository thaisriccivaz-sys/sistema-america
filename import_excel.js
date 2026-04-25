const XLSX = require('xlsx');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const workbook = XLSX.readFile('0.Lista Completa Colaboradores...xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function excelDateToJSDate(serial) {
    if (!serial || isNaN(serial)) return null;
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    const date_info = new Date(utc_value * 1000);
    const yyyy = date_info.getFullYear();
    const mm = String(date_info.getMonth() + 1).padStart(2, '0');
    const dd = String(date_info.getDate() + 1).padStart(2, '0'); // +1 because of excel timezone offset issue usually
    return `${yyyy}-${mm}-${dd}`;
}

async function run() {
    let imported = 0;
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        const stmt = db.prepare(`
            INSERT INTO colaboradores (
                nome_completo, cpf, rg, rg_data_emissao, data_nascimento, estado_civil,
                nome_pai, nome_mae, telefone, email, endereco,
                cargo, departamento, data_admissao, salario, status,
                contato_emergencia_telefone, contato_emergencia2_telefone,
                cnh_numero, cnh_vencimento, matricula_esocial,
                titulo_eleitoral, titulo_zona, titulo_secao,
                pis, grau_instrucao, certificado_militar
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (let i = 3; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0] || String(row[0]).trim() === '') continue; // Nome is null
            
            // Map columns
            const nome = String(row[0] || '').trim();
            const cargo = String(row[6] || '').trim();
            const setor = String(row[7] || '').trim();
            let nasc = row[8];
            if(typeof nasc === 'number') nasc = excelDateToJSDate(nasc);
            const rg = String(row[9] || '').trim();
            
            let emissao = row[10];
            if(typeof emissao === 'number') emissao = excelDateToJSDate(emissao);
            
            const cpf = String(row[11] || '').trim();
            
            let admissao = row[12];
            if(typeof admissao === 'number') admissao = excelDateToJSDate(admissao);
            
            const rua = String(row[14] || '');
            const num = String(row[15] || '');
            const compl = String(row[16] || '');
            const bairro = String(row[17] || '');
            const uf = String(row[18] || '');
            const cidade = String(row[19] || '');
            const cep = String(row[20] || '');
            
            let enderecoStr = '';
            if (rua) enderecoStr += rua + ', ' + num;
            if (compl && compl !== 'undefined') enderecoStr += ' - ' + compl;
            if (bairro) enderecoStr += ' - ' + bairro;
            if (cidade) enderecoStr += ', ' + cidade + ' - ' + uf;
            if (cep) enderecoStr += ', ' + cep;
            
            const cnh = String(row[21] || '');
            let cnh_val = row[22];
            if(typeof cnh_val === 'number') cnh_val = excelDateToJSDate(cnh_val);
            
            const matricula = String(row[26] || '');
            const pis = String(row[27] || '');
            const titulo = String(row[28] || '');
            const zona = String(row[29] || '');
            const secao = String(row[30] || '');
            const reserv = String(row[31] || '');
            const conj = String(row[32] || '');
            const tel = String(row[34] || '');
            const salario = String(row[39] || '');
            const instrucao = String(row[42] || '');
            const pai = String(row[43] || '');
            const mae = String(row[44] || '');
            const recado1 = String(row[46] || '');
            const recado2 = String(row[47] || '');
            
            // Assuming default active since header is "ATIVOS" usually? Or just Active
            let status = 'Ativo';
            
            stmt.run([
                nome, cpf, rg, emissao, nasc, conj, 
                pai, mae, tel, '', enderecoStr,
                cargo, setor, admissao, salario, status,
                recado1, recado2,
                cnh, cnh_val, matricula,
                titulo, zona, secao,
                pis, instrucao, reserv
            ]);
            imported++;
        }
        
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if(err) console.error("Erro no commit:", err);
            else console.log(`Sucesso! ${imported} colaboradores importados.`);
            db.close();
        });
    });
}

run();
