const fs = require('fs');

// 1. BACKEND: Fix email recipients
let s = fs.readFileSync('backend/server.js', 'utf8');
const s_regex = /db\.all\("SELECT email FROM usuarios WHERE ativo = 1 AND email IS NOT NULL AND email != ''", \[\], \(errU, users\) => \{/;
const s_repl = `db.all("SELECT u.email FROM usuarios u LEFT JOIN grupos_permissao gp ON u.grupo_permissao_id = gp.id WHERE u.ativo = 1 AND u.email IS NOT NULL AND u.email != '' AND (gp.departamento LIKE '%ogíst%' OR gp.departamento LIKE '%ogist%' OR u.departamento LIKE '%ogíst%' OR u.departamento LIKE '%ogist%')", [], (errU, users) => {`;
s = s.replace(s_regex, s_repl);
fs.writeFileSync('backend/server.js', s);

// 2. FRONTEND APP.JS: Add Logistics polling for popup
let a = fs.readFileSync('frontend/app.js', 'utf8');
if (!a.includes('checkLogisticaNotificacoes()')) {
    const pollCode = `
// --- POLLING: Notificacoes de Logistica ---
const _logNotifSeen = new Set();
async function checkLogisticaNotificacoes() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const permissoes = payload.permissoes || [];
        const isLog = permissoes.includes('logistica_completo') || permissoes.some(p => String(p).includes('logistica')) || permissoes.includes('logistica-credenciamento');
        if (!isLog) return;
    } catch(e) { return; }

    try {
        const resp = await fetch('/api/logistica/notificacoes/pendentes', {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();
        
        for (const notif of notifs) {
            if (_logNotifSeen.has(notif.id)) continue;
            _logNotifSeen.add(notif.id);
            
            try {
                const dados = JSON.parse(notif.dados || '{}');
                // Theme: Purple (Comercial)
                const popup = document.createElement('div');
                popup.style.cssText = \`
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(112,72,232,0.25), 0 0 0 1px rgba(112,72,232,0.1);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #7048e8;
                \`;
                popup.innerHTML = \`
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#f3e8ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#7048e8;">
                            <i class="ph ph-identification-card"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#7048e8;"></i> Novo Credenciamento
                            </div>
                            <div style="color:#7048e8;font-weight:600;font-size:0.95rem;margin-bottom:4px;">\${dados.cliente_nome || 'Cliente não informado'}</div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                Solicitado por: <strong>\${dados.solicitante || 'Comercial'}</strong>
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="navigateTo('logistica-credenciamento'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#7048e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Credenciamento
                                </button>
                                <button onclick="this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                \`;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);
                
                fetch(\`/api/logistica/notificacoes/\${notif.id}/lida\`, {
                    method: 'PUT',
                    headers: { 'Authorization': \`Bearer \${token}\` }
                }).catch(() => {});
                
                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            } catch(parseErr) { }
        }
    } catch(e) { }
}

setInterval(checkLogisticaNotificacoes, 60000);
setTimeout(checkLogisticaNotificacoes, 5000);

// --- LÓGICA RENDER PDF`;
    a = a.replace('// --- LÓGICA RENDER PDF', pollCode);
    fs.writeFileSync('frontend/app.js', a);
}

// 3. FRONTEND USUARIOS.JS: Add screens
let u = fs.readFileSync('frontend/usuarios.js', 'utf8');
if (!u.includes('logistica-credenciamento')) {
    u = u.replace(
        "    { modulo: 'Logística', pagina_id: 'logistica-multas',       pagina_nome: 'Multas',         icone: 'ph-receipt' },\r\n    // Módulo Financeiro",
        "    { modulo: 'Logística', pagina_id: 'logistica-multas',       pagina_nome: 'Multas',         icone: 'ph-receipt' },\r\n    { modulo: 'Logística', pagina_id: 'logistica-credenciamento', pagina_nome: 'Credenciamento', icone: 'ph-identification-card' },\r\n    // Módulo Financeiro"
    );
    u = u.replace(
        "    { modulo: 'Logística', pagina_id: 'logistica-multas',       pagina_nome: 'Multas',         icone: 'ph-receipt' },\n    // Módulo Financeiro",
        "    { modulo: 'Logística', pagina_id: 'logistica-multas',       pagina_nome: 'Multas',         icone: 'ph-receipt' },\n    { modulo: 'Logística', pagina_id: 'logistica-credenciamento', pagina_nome: 'Credenciamento', icone: 'ph-identification-card' },\n    // Módulo Financeiro"
    );
    
    u = u.replace(
        "    { modulo: 'Comercial', pagina_id: 'comercial-em-breve', pagina_nome: 'Comercial (Em breve)', icone: 'ph-handshake' },",
        "    { modulo: 'Comercial', pagina_id: 'comercial-credenciamento', pagina_nome: 'Solicitar Credencial', icone: 'ph-identification-card' },\n    { modulo: 'Comercial', pagina_id: 'comercial-em-breve', pagina_nome: 'Comercial (Em breve)', icone: 'ph-handshake' },"
    );
    fs.writeFileSync('frontend/usuarios.js', u);
}
console.log("Success");
