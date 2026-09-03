/**
 * fix_noturno_server.js
 * 1. Adicionar coluna adicional_noturno na tabela fechamento_mensal
 * 2. No endpoint ponto-colaborador: calcular horasNoturnas (HH:MM) e adicionalNoturnoValor (R$)
 * 3. Incluir adicional_noturno no INSERT/UPDATE do salvar
 */
const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');
const orig = code.length;

// --- Fix 1: Adicionar coluna adicional_noturno na migration da tabela ---
const oldCreateTable = `         plr, pensao, dias_intermitente, status, email_contabilidade)`;
const newCreateTable = `         plr, pensao, dias_intermitente, status, email_contabilidade, adicional_noturno)`;
if (code.indexOf(oldCreateTable) !== -1) {
    code = code.replace(oldCreateTable, newCreateTable);
    console.log('✅ Fix 1a: adicional_noturno no INSERT VALUES');
} else console.log('❌ Fix 1a: não encontrado');

const oldInsertCols = `(mes, ano, colaborador_id, horas_normais, horas_trabalhadas, horas_noturnas,\r\n         dias_falta, data_faltas, horas_atraso, extra_60, extra_100, dsr,\r\n         vt, farmacia, mercado, outros, multas, academia, consignado,\r\n         comissao, bonus_comissao, premio, insalubridade, periculosidade,\r\n         plr, pensao, dias_intermitente, status, email_contabilidade)`;
const newInsertCols = `(mes, ano, colaborador_id, horas_normais, horas_trabalhadas, horas_noturnas,\r\n         dias_falta, data_faltas, horas_atraso, extra_60, extra_100, dsr,\r\n         vt, farmacia, mercado, outros, multas, academia, consignado,\r\n         comissao, bonus_comissao, premio, insalubridade, periculosidade,\r\n         plr, pensao, dias_intermitente, status, email_contabilidade, adicional_noturno)`;
if (code.indexOf(oldInsertCols) !== -1) {
    code = code.replace(oldInsertCols, newInsertCols);
    console.log('✅ Fix 1b: adicional_noturno na lista de colunas do INSERT');
} else console.log('❌ Fix 1b: INSERT cols não encontrado');

const oldValues = `        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
const newValues = `        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
if (code.indexOf(oldValues) !== -1) {
    code = code.replace(oldValues, newValues);
    console.log('✅ Fix 1c: adicionado ? para adicional_noturno nos VALUES');
} else console.log('❌ Fix 1c: VALUES não encontrado');

const oldOnConflict = `            plr=excluded.plr, pensao=excluded.pensao, dias_intermitente=excluded.dias_intermitente,\r\n            status=excluded.status, email_contabilidade=excluded.email_contabilidade,\r\n            updated_at=CURRENT_TIMESTAMP\`);`;
const newOnConflict = `            plr=excluded.plr, pensao=excluded.pensao, dias_intermitente=excluded.dias_intermitente,\r\n            status=excluded.status, email_contabilidade=excluded.email_contabilidade,\r\n            adicional_noturno=excluded.adicional_noturno,\r\n            updated_at=CURRENT_TIMESTAMP\`);`;
if (code.indexOf(oldOnConflict) !== -1) {
    code = code.replace(oldOnConflict, newOnConflict);
    console.log('✅ Fix 1d: ON CONFLICT atualiza adicional_noturno');
} else console.log('❌ Fix 1d: ON CONFLICT não encontrado');

// Adicionar item.adicional_noturno no stmt.run()
const oldStmtRun = `                item.plr || 0, item.pensao || 0, item.dias_intermitente || 0,\r\n                item.status || 'rascunho', item.email_contabilidade || 'thais.ricci@americarental.com.br'\r\n            ]`;
const newStmtRun = `                item.plr || 0, item.pensao || 0, item.dias_intermitente || 0,\r\n                item.status || 'rascunho', item.email_contabilidade || 'thais.ricci@americarental.com.br',\r\n                item.adicional_noturno || 0\r\n            ]`;
if (code.indexOf(oldStmtRun) !== -1) {
    code = code.replace(oldStmtRun, newStmtRun);
    console.log('✅ Fix 1e: adicional_noturno no stmt.run()');
} else console.log('❌ Fix 1e: stmt.run não encontrado');

// --- Fix 2: Auto-migration da coluna adicional_noturno ---
// Após a migration da fechamento_mensal, adicionar ALTER TABLE
const oldMigrationEnd = `})\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_mensal:', err.message); });`;
const newMigrationEnd = `})\`, (err) => { if (err && !err.message.includes('already exists')) console.error('[Migration] fechamento_mensal:', err.message); });
db.run('ALTER TABLE fechamento_mensal ADD COLUMN adicional_noturno REAL DEFAULT 0', (e) => {
    if (e && !e.message.includes('duplicate')) {} // coluna já existe — OK
});`;
if (code.indexOf(oldMigrationEnd) !== -1) {
    code = code.replace(oldMigrationEnd, newMigrationEnd);
    console.log('✅ Fix 2: ALTER TABLE adicional_noturno');
} else console.log('❌ Fix 2: migration end não encontrado');

// --- Fix 3: endpoint ponto-colaborador — calcular horasNoturnas + adicionalNoturnoValor ---
// Encontrar onde o resultado de processarApuracao é usado para montar a resposta
const oldPontoResp = `            return res.json({\r\n                success: true,\r\n                encontrado: true,\r\n                idRHID: idRHID,\r\n                nomeRHID: nomeRHID,\r\n                dataIni, dataFinal,\r\n                ...resultado\r\n            });`;
const newPontoResp = `            // Calcular adicional noturno com base nos minutosNoturnos do RHID
            const _minNot = resultado.minutosNoturnos || 0;
            let _horasNotStr = '';
            let _adicionalNotVal = 0;
            if (_minNot > 0) {
                // Hora noturna reduzida: 1h real = 52.5min → fator 60/52.5 = 1.142857
                const _minNotReduzido = _minNot * (60 / 52.5);
                const _hNotReduzido = _minNotReduzido / 60; // horas decimais
                // Valor da hora = salário / horas_normais
                const _salario = parseFloat(colaborador.salario) || 0;
                const _hNorm = parseFloat(resultado.diasTrabalhados) > 0
                    ? (resultado.diasTrabalhados * 8)
                    : 220;
                const _valHora = _salario > 0 ? (_salario / _hNorm) : 0;
                _adicionalNotVal = Math.round(_hNotReduzido * _valHora * 0.20 * 100) / 100;
                // Formatar HH:MM (horas brutas, sem redução — para exibir tempo real noturno)
                const _hBruto = Math.floor(_minNot / 60);
                const _mBruto = _minNot % 60;
                _horasNotStr = String(_hBruto).padStart(2, '0') + ':' + String(_mBruto).padStart(2, '0');
            }
            return res.json({
                success: true,
                encontrado: true,
                idRHID: idRHID,
                nomeRHID: nomeRHID,
                dataIni, dataFinal,
                horasNoturnas: _horasNotStr,
                adicionalNoturnoValor: _adicionalNotVal,
                ...resultado
            });`;

if (code.indexOf(oldPontoResp) !== -1) {
    code = code.replace(oldPontoResp, newPontoResp);
    console.log('✅ Fix 3: endpoint ponto calcula horasNoturnas e adicionalNoturnoValor');
} else {
    // Tentar variante LF
    const oldLF = oldPontoResp.replace(/\r\n/g, '\n');
    if (code.indexOf(oldLF) !== -1) {
        code = code.replace(oldLF, newPontoResp);
        console.log('✅ Fix 3 (LF): endpoint ponto calcula horasNoturnas');
    } else {
        console.log('❌ Fix 3: âncora ponto response não encontrada');
    }
}

fs.writeFileSync('backend/server.js', code, 'utf8');
console.log('server.js salvo, tamanho:', code.length, '(era:', orig, ')');
