const db = require('./backend/database');

db.all("SELECT id, created_at, updated_at FROM sac_tickets WHERE stage = 'execucao' AND (sla_frozen_at IS NULL OR sla_frozen_at = '')", [], (err, rows) => {
    if (err) return console.error(err);
    if (!rows || rows.length === 0) {
        console.log("Nenhum chamado em acompanhamento precisa de correcao.");
        return;
    }
    rows.forEach(r => {
        const frozenAt = r.updated_at || new Date().toISOString();
        const opened = new Date(r.created_at).getTime();
        const frozenMs = new Date(frozenAt).getTime();
        const elapsedMs = frozenMs - opened;
        
        db.run("UPDATE sac_tickets SET sla_frozen_at = ?, sla_elapsed_ms = ? WHERE id = ?", [frozenAt, elapsedMs, r.id], (err2) => {
            if (err2) console.error("Erro no id " + r.id, err2);
            else console.log("Chamado " + r.id + " corrigido com sucesso.");
        });
    });
});
