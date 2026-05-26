const db = require('./backend/database');
setTimeout(() => {
    // Check all colabs in Logistica regardless of email
    db.all("SELECT id, nome_completo, email, email_corporativo, departamento, cargo, status FROM colaboradores WHERE departamento LIKE '%ogist%'", [], (e, r) => {
        if (e) { console.error('logistica err:', e.message); return; }
        console.log('All logistica colabs:', r.length);
        r.forEach(c => console.log(JSON.stringify({id:c.id, nome:c.nome_completo, email:c.email, email_corp:c.email_corporativo, dept:c.departamento, cargo:c.cargo, status:c.status})));
    });
    // Check credenciamentos
    db.all("SELECT * FROM credenciamentos ORDER BY id DESC LIMIT 5", [], (e, r) => {
        if (e) { console.error('credenciamentos err:', e.message); return; }
        console.log('Recent credenciamentos:', r.length);
        r.forEach(c => console.log(JSON.stringify({id:c.id, cliente_nome:c.cliente_nome, status:c.status, os:c.os})));
    });
    // Check users with logistica access
    db.all("SELECT id, username, nome, email, departamento FROM usuarios", [], (e, r) => {
        if (e) { console.error('usuarios err:', e.message); return; }
        console.log('All users:', r.length);
        r.forEach(u => console.log(JSON.stringify(u)));
    });
}, 2000);
