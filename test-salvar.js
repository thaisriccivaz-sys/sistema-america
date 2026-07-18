const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/data/hr_system_v2.sqlite');

const mes = '05';
const ano = '2026';
const itens = [
    {
        colaborador_id: 1,
        dias_trabalhados: 20,
        dias_vr: 20,
        faltas: 0,
        dias_extra: 0,
        valor_vr: 35.00,
        apuracao_diaria: JSON.stringify([])
    }
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    db.run("ALTER TABLE recibos_historico ADD COLUMN apuracao_diaria TEXT", function(errAlter) {
        if (errAlter) console.log('ALTER TABLE err:', errAlter.message);

        const stmt = db.prepare(`
        INSERT INTO recibos_historico (mes, ano, colaborador_id, dias_trabalhados, dias_vr, faltas, dias_extra, valor_vr, apuracao_diaria) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(colaborador_id, mes, ano) 
        DO UPDATE SET 
            dias_trabalhados=excluded.dias_trabalhados,
            dias_vr=excluded.dias_vr,
            faltas=excluded.faltas,
            dias_extra=excluded.dias_extra,
            valor_vr=excluded.valor_vr,
            apuracao_diaria=COALESCE(excluded.apuracao_diaria, recibos_historico.apuracao_diaria)
        `, function(errPrep) {
            if (errPrep) {
                console.error('[PREPARE ERROR]:', errPrep.message);
            }
        });
        
        let pending = itens.length;
        let runError = null;
        itens.forEach(i => {
            stmt.run([mes, ano, i.colaborador_id, i.dias_trabalhados, i.dias_vr, i.faltas, i.dias_extra, i.valor_vr, i.apuracao_diaria], function(errRun) {
                if (errRun && !runError) {
                    runError = errRun;
                    console.error('[RUN ERROR]:', errRun.message);
                }
                pending--;
                if (pending === 0) {
                    stmt.finalize();
                    if (runError) {
                        db.run('ROLLBACK', () => console.log('Rolled back'));
                    } else {
                        db.run('COMMIT', () => console.log('Committed successfully'));
                    }
                }
            });
        });
    });
});
