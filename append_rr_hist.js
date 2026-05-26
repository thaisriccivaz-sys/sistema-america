const fs = require('fs');
const code = `
window._rrAbrirHistoricoAlteracoes = async function() {
    const overlay = document.createElement('div');
    overlay.id = 'rr-hist-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.7);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;backdrop-filter:blur(3px);overflow-y:auto;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = \`<div style="background:#fff;border-radius:16px;width:100%;max-width:1100px;box-shadow:0 25px 60px rgba(0,0,0,.35);animation:rrHistSlide .25s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:1.2rem 1.5rem;background:linear-gradient(135deg,#2d9e5f,#1a7a46);border-radius:16px 16px 0 0;position:sticky;top:0;z-index:1;">
            <div style="display:flex;align-items:center;gap:10px;">
                <i class="ph ph-clock-counter-clockwise" style="font-size:1.4rem;color:rgba(255,255,255,0.8);"></i>
                <span style="color:#fff;font-weight:700;font-size:1.05rem;">Histórico de Alterações — Resumo de Rota</span>
            </div>
            <button onclick="document.getElementById('rr-hist-overlay').remove()" style="background:rgba(255,255,255,.2);border:none;border-radius:8px;color:#fff;width:32px;height:32px;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="padding:1.5rem;" id="rr-hist-body"><div style="text-align:center;padding:2rem;color:#94a3b8;">Carregando...</div></div>
    </div>
    <style>@keyframes rrHistSlide{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>\`;
    document.body.appendChild(overlay);

    try {
        const token = window.currentToken || localStorage.getItem('erp_token') || '';
        const res = await fetch('/api/logistica/resumo-rota-auditoria', {
            headers: { Authorization: 'Bearer ' + token }
        });
        const rows = await res.json();
        const body = document.getElementById('rr-hist-body');
        if (!rows || !rows.length) {
            body.innerHTML = '<div style="text-align:center;padding:3rem;color:#94a3b8;"><i class="ph ph-clock" style="font-size:3rem;opacity:0.4;"></i><p style="margin-top:1rem;">Nenhuma alteração registrada ainda.</p></div>';
            return;
        }
        body.innerHTML = \`<table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead><tr style="background:#f1f5f9;">
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Data/Hora</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Dia da Rota</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Veículo</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Campo</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Usuário</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Conteúdo Anterior</th>
                <th style="padding:10px 12px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Conteúdo Atual</th>
            </tr></thead>
            <tbody>\${rows.map((r, i) => {
                const dataFmt = r.data_rota ? r.data_rota.split('-').reverse().join('/') : '—';
                return \`<tr style="background:\${i%2===0?'#fff':'#f8fafc'};border-bottom:1px solid #f1f5f9;">
                    <td style="padding:10px 12px;color:#475569;white-space:nowrap;">\${(r.created_at||'').slice(0,16).replace('T',' ')}</td>
                    <td style="padding:10px 12px;font-weight:600;color:#1e293b;">\${dataFmt}</td>
                    <td style="padding:10px 12px;color:#475569;">\${r.veiculo||'—'}</td>
                    <td style="padding:10px 12px;"><span style="background:#f0fdf4;color:#16a34a;border-radius:6px;padding:2px 8px;font-size:0.8rem;">\${r.campo||'—'}</span></td>
                    <td style="padding:10px 12px;color:#7c3aed;font-weight:600;">\${r.usuario_nome||'—'}</td>
                    <td style="padding:10px 12px;font-size:0.8rem;color:#ef4444;max-width:200px;overflow:hidden;text-overflow:ellipsis;">\${r.valor_anterior||'—'}</td>
                    <td style="padding:10px 12px;font-size:0.8rem;color:#10b981;max-width:200px;overflow:hidden;text-overflow:ellipsis;">\${r.valor_atual||'—'}</td>
                </tr>\`;
            }).join('')}</tbody>
        </table>\`;
    } catch(e) {
        document.getElementById('rr-hist-body').innerHTML = '<div style="text-align:center;padding:2rem;color:#dc2626;">Erro ao carregar histórico: ' + e.message + '</div>';
    }
};
`;
fs.appendFileSync('frontend/resumo_rota.js', code, 'utf8');
