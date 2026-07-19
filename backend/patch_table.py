
# -*- coding: utf-8 -*-
import re
f = r'C:\A\OneDrive - AMERICA RENTAL EQUIPAMENTOS LTDA\Documentos - America Rental\Diretoria\Teste Sistema\cadastro-colaboradores\frontend\integracao.js'
with open(f, 'r', encoding='utf-8') as fh:
    content = fh.read()

# Replace the layout of passos with a table
regex_passos = r"let html = '';\nif \(passos\.length === 0\) \{.*?document\.getElementById\('modal-integ-passos-container'\)\.innerHTML = html;"

table_html = """let html = '';
if (passos.length === 0) {
    html = `<div style="text-align:center;padding:2rem;color:#94a3b8;"><i class="ph ph-clipboard-text" style="font-size:2rem;"></i><p style="margin-top:.5rem;">Nenhum passo configurado.</p></div>`;
} else {
    const total = passos.length;
    const concluidos = passos.filter(p => p.status === 'feito' || p.status === 'nao_aplica').length;
    const perc = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    
    html = `
    <div style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="font-size: 0.9rem; font-weight: 600; color: #334155;">Progresso (Minhas Ações):</div>
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; max-width: 300px; margin-left: 15px;">
            <div style="flex: 1; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${perc}%; background: ${perc === 100 ? '#10b981' : '#3b82f6'}; border-radius: 4px; transition: width 0.3s;"></div>
            </div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #475569; width: 40px; text-align: right;">${perc}%</div>
        </div>
    </div>
    <div style="overflow-x:auto; border-radius: 8px; border: 1px solid #e2e8f0;">
    <table style="width:100%; border-collapse: collapse; text-align: left; font-size: 0.85rem;">
        <thead style="background: #f1f5f9; color: #475569;">
            <tr>
                <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 40px; text-align: center;">Status</th>
                <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Ação</th>
                <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 120px;">Responsável</th>
                <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 100px;">Realizado em</th>
                <th style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 80px; text-align: center;">Concluído</th>
            </tr>
        </thead>
        <tbody>`;

    passos.forEach(p => {
        const stInfo = INTEG_STATUS[p.status]||INTEG_STATUS.pendente; 
        const isPendente = p.status==='pendente';
        const isFeito = p.status==='feito' || p.status==='nao_aplica';
        const isAguardando = p.status==='aguardando_experiencia';
        
        // Define color logic
        const titleColor = (isPendente || isAguardando) ? '#0f172a' : '#94a3b8';
        const textDecoration = p.status === 'feito' ? 'text-decoration:line-through;' : '';
        
        // Checkbox logic
        // If not pendente and not aguardando, it's done (checked).
        // If aguardando, checkbox is disabled.
        let checkboxHtml = '';
        if (isAguardando) {
            checkboxHtml = `<input type="checkbox" disabled title="Aguardando Experiência" style="cursor: not-allowed; width: 16px; height: 16px;">`;
        } else {
            checkboxHtml = `<input type="checkbox" ${isFeito ? 'checked' : ''} onchange="window.marcarPassoInteg(${p.id}, ${processoId}, this.checked ? 'feito' : 'pendente')" style="cursor: pointer; width: 16px; height: 16px;">`;
        }
        
        html += `<tr id="passo-row-${p.id}" style="border-bottom: 1px solid #f1f5f9; background: ${isFeito ? '#f8fafc' : '#ffffff'}; transition: all .2s;">
            <td style="padding: 10px 12px; text-align: center;"><i class="ph ${stInfo.icon}" style="color:${stInfo.color}; font-size: 1.2rem;" title="${stInfo.label}"></i></td>
            <td style="padding: 10px 12px;">
                <div style="font-weight: ${isPendente ? '600' : '400'}; color: ${titleColor}; ${textDecoration}">${p.titulo}</div>
                ${p.descricao ? `<div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">${p.descricao}</div>` : ''}
            </td>
            <td style="padding: 10px 12px; color: #64748b; font-size: 0.8rem;">${p.responsavel_username || p.responsavel_nome || '-'}</td>
            <td style="padding: 10px 12px; color: #059669; font-size: 0.78rem;">${p.feito_em ? new Date(p.feito_em).toLocaleDateString('pt-BR') : '-'}</td>
            <td style="padding: 10px 12px; text-align: center;">${checkboxHtml}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
}
document.getElementById('modal-integ-passos-container').innerHTML = html;"""

content = re.sub(regex_passos, table_html, content, flags=re.DOTALL)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(content)

print("Patched frontend/integracao.js")
