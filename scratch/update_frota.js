const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../backend/data/hr_system_v2.sqlite'));

const excelPath = 'C:/A/OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA/Documentos - America Rental/Diretoria/Teste Sistema/Exemplos/Frota_Veiculos_2026-05-03 (1).xlsx';

const wb = xlsx.readFile(excelPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(ws);

const dbQuery = (query, params) => new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbGet = (query, params) => new Promise((resolve, reject) => {
    db.get(query, params, function(err, row) {
        if (err) reject(err);
        else resolve(row);
    });
});

async function main() {
    console.log(`Lendo ${rows.length} linhas do arquivo excel...`);
    let countSuccess = 0;
    
    for (const row of rows) {
        const placa = row['Placa'];
        if (!placa) continue;

        const clean = val => val === undefined || val === null || val === 'undefined' ? '' : val.toString();

        const data = {
            marca_modelo_versao: clean(row['Marca / Modelo / Versão']),
            cor_predominante: clean(row['Cor Predominante']),
            ano_modelo: clean(row['Ano Modelo']),
            exercicio: clean(row['Exercício']),
            renavam: clean(row['RENAVAM']),
            capacidade_tanque: clean(row['Capacidade Tanque (L)']),
            capacidade_carga: clean(row['Capacidade Carga (KG)']),
            tipo_veiculo: clean(row['Tipo de Veículo']),
            altura_com_banheiro: clean(row['Altura c/ Banheiro']),
            altura_sem_banheiro: clean(row['Altura s/ Banheiro']),
            largura_com_banheiro: clean(row['Largura c/ Banheiro']),
            largura_sem_banheiro: clean(row['Largura s/ Banheiro']),
            profundidade_com_banheiro: clean(row['Profundidade c/ Banheiro']),
            profundidade_sem_banheiro: clean(row['Profundidade s/ Banheiro'])
        };

        try {
            const existing = await dbGet('SELECT id FROM frota_veiculos WHERE placa = ?', [placa]);

            if (existing) {
                const sql = `
                    UPDATE frota_veiculos SET 
                        marca_modelo_versao = ?, cor_predominante = ?, ano_modelo = ?, exercicio = ?, renavam = ?, capacidade_tanque = ?, capacidade_carga = ?, tipo_veiculo = ?, altura_com_banheiro = ?, altura_sem_banheiro = ?, largura_com_banheiro = ?, largura_sem_banheiro = ?, profundidade_com_banheiro = ?, profundidade_sem_banheiro = ?
                    WHERE placa = ?
                `;
                const params = [
                    data.marca_modelo_versao, data.cor_predominante, data.ano_modelo, data.exercicio, data.renavam, data.capacidade_tanque, data.capacidade_carga, data.tipo_veiculo, data.altura_com_banheiro, data.altura_sem_banheiro, data.largura_com_banheiro, data.largura_sem_banheiro, data.profundidade_com_banheiro, data.profundidade_sem_banheiro, placa
                ];
                await dbQuery(sql, params);
                console.log(`✔ Atualizado: ${placa}`);
                countSuccess++;
            } else {
                const sql = `
                    INSERT INTO frota_veiculos (
                        placa, marca_modelo_versao, cor_predominante, ano_modelo, exercicio, renavam, capacidade_tanque, capacidade_carga, tipo_veiculo, altura_com_banheiro, altura_sem_banheiro, largura_com_banheiro, largura_sem_banheiro, profundidade_com_banheiro, profundidade_sem_banheiro
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const params = [
                    placa, data.marca_modelo_versao, data.cor_predominante, data.ano_modelo, data.exercicio, data.renavam, data.capacidade_tanque, data.capacidade_carga, data.tipo_veiculo, data.altura_com_banheiro, data.altura_sem_banheiro, data.largura_com_banheiro, data.largura_sem_banheiro, data.profundidade_com_banheiro, data.profundidade_sem_banheiro
                ];
                await dbQuery(sql, params);
                console.log(`✔ Inserido: ${placa}`);
                countSuccess++;
            }
        } catch (e) {
            console.error(`Erro na placa ${placa}:`, e.message);
        }
    }
    console.log(`\nFinalizado. Total processado com sucesso: ${countSuccess}`);
    db.close();
}

main();
