const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/hr_system_v2.sqlite');

// Busca o Walace e suas fichas de EPI
db.get("SELECT id, nome_completo, cargo, departamento FROM colaboradores WHERE nome_completo LIKE '%Walace%' LIMIT 1", [], (err, colab) => {
    if (err || !colab) { console.log('Walace não encontrado:', err && err.message); db.close(); return; }
    
    console.log('=== DADOS DO WALACE ===');
    console.log('cargo: [' + colab.cargo + ']');
    console.log('departamento: [' + colab.departamento + ']');

    db.all('SELECT id, grupo, status, created_at, motivo_fechamento FROM colaborador_epi_fichas WHERE colaborador_id=? ORDER BY id DESC', [colab.id], (err2, fichas) => {
        console.log('\n=== FICHAS DE EPI ===');
        fichas && fichas.forEach(f => {
            console.log('Ficha ID=' + f.id + ', grupo=[' + f.grupo + '], status=' + f.status + ', criada=' + f.created_at + ', fechamento=' + f.motivo_fechamento);
        });

        // Simula matching com os dados REAIS do Walace
        db.all('SELECT id, grupo, departamentos_json FROM epi_templates ORDER BY id', [], (err3, templates) => {
            console.log('\n=== SIMULACAO COM DADOS REAIS ===');
            const cLow = (colab.cargo || '').trim().toLowerCase();
            const dLow = (colab.departamento || '').trim().toLowerCase();
            console.log('cargo: [' + cLow + ']');
            console.log('dept: [' + dLow + ']');

            const match = templates.find(t => {
                let list = [];
                try { list = JSON.parse(t.departamentos_json || '[]'); } catch(e){}
                list = list.map(x => x.trim().toLowerCase());
                const gLow = (t.grupo || '').trim().toLowerCase();
                if (list.includes(dLow) || list.includes(cLow)) return true;
                if (gLow === dLow || gLow === cLow) return true;
                if (cLow && (list.some(l => l.length > 3 && cLow.includes(l)) || (gLow.length > 3 && cLow.includes(gLow)))) return true;
                if (dLow && (list.some(l => l.length > 3 && dLow.includes(l)) || (gLow.length > 3 && dLow.includes(gLow)))) return true;
                return false;
            });
            
            if (match) {
                console.log('Template encontrado: [' + match.grupo + '] ID=' + match.id);
            } else {
                console.log('NENHUM TEMPLATE ENCONTRADO!');
            }

            // Mostra todos os matches
            templates.forEach(t => {
                let list = [];
                try { list = JSON.parse(t.departamentos_json || '[]'); } catch(e){}
                list = list.map(x => x.trim().toLowerCase());
                const gLow = (t.grupo || '').trim().toLowerCase();
                const m1 = list.includes(dLow) || list.includes(cLow);
                const m2 = gLow === dLow || gLow === cLow;
                const m3 = cLow && (list.some(l => l.length > 3 && cLow.includes(l)) || (gLow.length > 3 && cLow.includes(gLow)));
                const m4 = dLow && (list.some(l => l.length > 3 && dLow.includes(l)) || (gLow.length > 3 && dLow.includes(gLow)));
                if (m1 || m2 || m3 || m4) {
                    console.log('  MATCH template [' + t.grupo + ']: m1=' + m1 + ' m2=' + m2 + ' m3=' + m3 + ' m4=' + m4);
                }
            });

            db.close();
        });
    });
});
