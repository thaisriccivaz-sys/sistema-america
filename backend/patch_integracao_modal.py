# -*- coding: utf-8 -*-
import re

html_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

if 'modal-integ-pct' not in html:
    html = html.replace('<div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap;" id="modal-integ-badges"></div>',
                        '<div style="margin-top:1rem;display:flex;gap:8px;flex-wrap:wrap;" id="modal-integ-badges"></div>\n<div id="modal-integ-pct" style="margin-top:1rem;font-size:1rem;font-weight:700;"></div>')
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Updated index.html")

js_file = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Add percentage logic
js = re.sub(
    r'(const badges = \[\];.*?\n\s+document\.getElementById\(\'modal-integ-badges\'\)\.innerHTML = badges\.join\(\'\'\);)',
    r'\1\n        const totalPassos = data.passos ? data.passos.length : 0;\n        const concluidos = (data.passos||[]).filter(p => p.status === "feito" || p.status === "nao_aplica").length;\n        const pct = totalPassos > 0 ? Math.round((concluidos / totalPassos) * 100) : 0;\n        const pctContainer = document.getElementById("modal-integ-pct");\n        if (pctContainer) pctContainer.innerHTML = `Progresso (Suas Responsabilidades): ${pct}% <div style="margin-top:5px;width:100%;height:8px;background:rgba(255,255,255,0.3);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:#fff;border-radius:4px;transition:width .5s;"></div></div>`;',
    js, flags=re.DOTALL
)

# Replace buttons with checkbox
old_buttons = r"""<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">${isPendente?`<button onclick="window.marcarPassoInteg(${p.id},${processoId},'feito')" style="background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:8px;font-size:.78rem;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;"><i class="ph ph-check"></i> Marcar Feito</button><button onclick="window.marcarPassoInteg(${p.id},${processoId},'nao_aplica')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;"><i class="ph ph-x"></i> Não se aplica</button>`:(p.status!=='pendente' && p.status!=='aguardando_experiencia')?`<button onclick=\"window.marcarPassoInteg(${p.id},${processoId},'pendente')" style="background:none;color:#94a3b8;border:1px solid #e2e8f0;padding:4px 10px;border-radius:8px;font-size:.75rem;cursor:pointer;white-space:nowrap;">Desfazer</button>`:''}</div>"""
new_checkbox = r"""<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
    <label style="display:flex;align-items:center;gap:6px;font-size:0.9rem;font-weight:600;cursor:pointer;color:#334155;">
        <input type="checkbox" style="width:18px;height:18px;cursor:pointer;" 
            ${(!isPendente && p.status !== 'aguardando_experiencia') ? 'checked' : ''} 
            onchange="window.marcarPassoIntegCheckbox(this, ${p.id}, ${processoId}, '${p.status}')">
        Feito
    </label>
</div>"""

if "window.marcarPassoIntegCheckbox" not in js:
    js = js.replace(old_buttons, new_checkbox)
    
    # Add checkbox handler function
    handler = """
window.marcarPassoIntegCheckbox = async function(checkbox, passoStatusId, processoId, currentStatus) {
    const isChecked = checkbox.checked;
    const newStatus = isChecked ? 'feito' : 'pendente';
    const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
    checkbox.disabled = true;
    try {
        const res = await fetch(`/api/integracao/passos-status/${passoStatusId}`, { method:'PUT', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({status: newStatus}) });
        if (!res.ok) { const d=await res.json(); throw new Error(d.error||'Erro'); }
        await window.abrirProcessoIntegracao(processoId);
        window.renderIntegracaoLista();
        if(window.atualizarBadgeIntegracao) window.atualizarBadgeIntegracao();
    } catch(e) {
        alert(e.message);
        checkbox.checked = !isChecked; // revert
    } finally {
        checkbox.disabled = false;
    }
};
"""
    js += handler

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Updated integracao.js")
