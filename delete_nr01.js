const db = require('./backend/database');

// Listar geradores com NR01 no nome
db.all("SELECT id, nome FROM geradores WHERE nome LIKE '%NR01%' OR nome LIKE '%NR-01%'", [], (err, rows) => {
    if (err) { console.error(err); process.exit(1); }
    console.log('Geradores encontrados:', rows);

    // Apagar os que estão em MAIÚSCULAS (o que tem nome == original.toUpperCase())
    const toDelete = rows.filter(r => r.nome === r.nome.toUpperCase());
    if (toDelete.length === 0) {
        console.log('Nenhum gerador em maiúsculas para deletar.');
        // Try broader: delete the one with all caps title
        const allCaps = rows.find(r => /^[A-ZÁÉÍÓÚÃÕÀÂÊ\s0-9\-]+$/.test(r.nome));
        if (allCaps) {
            db.run('DELETE FROM geradores WHERE id = ?', [allCaps.id], function(e) {
                if (e) console.error('Erro ao deletar:', e);
                else console.log('Deletado (all caps):', allCaps.nome, '| ID:', allCaps.id, '| changes:', this.changes);
                db.close();
            });
        } else {
            console.log('Nenhuma variação all-caps encontrada. Listando todos.');
            rows.forEach(r => console.log(' -', r.id, r.nome));
            db.close();
        }
    } else {
        toDelete.forEach(r => {
            db.run('DELETE FROM geradores WHERE id = ?', [r.id], function(e) {
                if (e) console.error('Erro ao deletar:', e);
                else console.log('Deletado:', r.nome, '| ID:', r.id, '| changes:', this.changes);
            });
        });
        setTimeout(() => db.close(), 500);
    }
});
