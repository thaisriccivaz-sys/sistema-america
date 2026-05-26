const fs = require('fs');

let app = fs.readFileSync('frontend/app.js', 'utf8');

const popupLogic = `
// --- POLLING: Notificacoes de Diretoria ---
const _dirNotifSeen = new Set();
async function checkDiretoriaNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;
    try {
        if (!window.isTopAdmin) return;
    } catch(e) { return; }

    try {
        const resp = await fetch('/api/diretoria/notificacoes/pendentes', {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (!resp.ok) return;
        const notifs = await resp.json();
        
        for (const notif of notifs) {
            if (_dirNotifSeen.has(notif.id)) continue;
            _dirNotifSeen.add(notif.id);
            
            try {
                const dados = JSON.parse(notif.dados || '{}');
                // Theme: Red (Diretoria)
                const popup = document.createElement('div');
                popup.style.cssText = \`
                    position:fixed; bottom:24px; left:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(201,42,42,0.25), 0 0 0 1px rgba(201,42,42,0.1);
                    max-width:380px; animation: slideInLeft 0.4s ease-out;
                    border-left: 4px solid #c92a2a;
                \`;
                popup.innerHTML = \`
                    <div style="display:flex;align-items:flex-start;gap:12px;">
                        <div style="width:40px;height:40px;border-radius:10px;background:#fff5f5;color:#c92a2a;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="ph ph-warning-circle" style="font-size:1.5rem;"></i>
                        </div>
                        <div style="flex:1;">
                            <h4 style="margin:0 0 4px 0;font-size:1rem;color:#c92a2a;font-weight:700;">Aviso de Desligamento</h4>
                            <p style="margin:0;font-size:0.85rem;color:#475569;line-height:1.4;">O colaborador <b>\${dados.colab_nome || 'Desconhecido'}</b>, responsável pela área <b>\${dados.area || 'Desconhecida'}</b>, foi desligado.</p>
                            <p style="margin:8px 0 0 0;font-size:0.8rem;color:#e03131;font-weight:600;">Outro colaborador deve ser incluído na função.</p>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markDirNotifLida('\${notif.id}'); navigateTo('departamentos'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#c92a2a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Gerenciar Áreas
                                </button>
                                <button onclick="window.markDirNotifLida('\${notif.id}'); this.closest('[data-notif-id]').remove();" 
                                    style="padding:6px 12px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;cursor:pointer;font-size:0.8rem;">
                                    X 
                                </button>
                            </div>
                        </div>
                    </div>
                \`;
                popup.setAttribute('data-notif-id', notif.id);
                document.body.appendChild(popup);
                setTimeout(() => { if (popup.parentNode) popup.remove(); }, 30000);
            } catch(parseErr) { }
        }
    } catch(e) { }
}
setInterval(checkDiretoriaNotificacoes, 60000);
setTimeout(checkDiretoriaNotificacoes, 7000);

window.markDirNotifLida = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/diretoria/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(()=>{});
};
`;

if (!app.includes('checkDiretoriaNotificacoes')) {
    app = app.replace('// --- POLLING', popupLogic + '\n// --- POLLING');
    fs.writeFileSync('frontend/app.js', app);
}
