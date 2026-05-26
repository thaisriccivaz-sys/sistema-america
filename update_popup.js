const fs = require('fs');

let path = 'frontend/app.js';
let content = fs.readFileSync(path, 'utf8');

const regex = /async function checkComercialNotificacoes\(\) \{[\s\S]*?setInterval\(checkComercialNotificacoes, 60000\);/g;

const newCode = `async function checkComercialNotificacoes() {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    if (!token) return;

    try {
        const resp = await fetch('/api/comercial/notificacoes/pendentes', {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        if (!resp.ok) return;
        const notificacoes = await resp.json();

        for (const notif of notificacoes) {
            if (!_comNotifSeen.has(notif.id)) {
                _comNotifSeen.add(notif.id);
                
                const popup = document.createElement('div');
                popup.style.cssText = \`
                    position:fixed; bottom:24px; right:24px; z-index:99999;
                    background:#fff; border-radius:16px; padding:1.5rem;
                    box-shadow: 0 20px 60px rgba(22,163,74,0.25), 0 0 0 1px rgba(22,163,74,0.1);
                    max-width:380px; animation: slideInRight 0.4s ease-out;
                    border-left: 4px solid #16a34a;
                \`;
                
                let titulo = notif.tipo === 'credenciamento_enviado' ? 'Envio do Credenciamento' : 'Acesso ao Credenciamento';
                let icon = notif.tipo === 'credenciamento_enviado' ? 'ph-paper-plane-right' : 'ph-eye';
                
                popup.innerHTML = \`
                    <div style="display:flex;align-items:flex-start;gap:1rem;">
                        <div style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.4rem;color:#16a34a;">
                            <i class="ph \${icon}"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;font-size:0.9rem;color:#0f172a;margin-bottom:4px;">
                                <i class="ph ph-bell-ringing" style="color:#16a34a;"></i> \${titulo}
                            </div>
                            <div style="color:#64748b;font-size:0.8rem;">
                                \${notif.mensagem}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:12px;">
                                <button onclick="window.markComNotifLida('\${notif.id}'); navigateTo('credenciamento'); this.closest('[data-notif-id]').remove();" 
                                    style="flex:1;padding:6px 12px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.8rem;">
                                    Ver Tela
                                </button>
                                <button onclick="window.markComNotifLida('\${notif.id}'); this.closest('[data-notif-id]').remove();" 
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
            }
        }
    } catch(err) {
        // ignora silently
    }
}

window.markComNotifLida = function(id) {
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    fetch('/api/comercial/notificacoes/' + id + '/lida', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + token } }).catch(()=>{});
};

setInterval(checkComercialNotificacoes, 60000);`;

content = content.replace(regex, newCode);
fs.writeFileSync(path, content, 'utf8');
console.log("Updated checkComercialNotificacoes popup layout");