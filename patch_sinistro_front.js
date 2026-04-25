const fs = require('fs');
const file = 'frontend/sinistros.js';
let content = fs.readFileSync(file, 'utf8');

// Adiciona a funcao window.excluirSinistro
if (!content.includes('window.excluirSinistro')) {
    content += `\nwindow.excluirSinistro = async function(sinId, colabId) {
    if (!confirm('Tem certeza que deseja excluir este sinistro permanentemente?')) return;
    try {
        const res = await fetch(\`\${API_URL}/colaboradores/\${colabId}/sinistros/\${sinId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${localStorage.getItem('erp_token')}\` }
        });
        const data = await res.json();
        if (!data.sucesso) throw new Error(data.error);
        alert('Sinistro excluído com sucesso.');
        window._recarregarListaSinistros(colabId);
    } catch(e) {
        alert('Erro ao excluir: ' + e.message);
    }
};\n`;
}

// Injeta o botao excluir
if (content.includes('actionsHtml += `</div>`;')) {
    content = content.replace(
        'actionsHtml += `</div>`;', 
        `actionsHtml += \`<button class="btn btn-sm btn-outline-danger" onclick="window.excluirSinistro(\${s.id}, \${colabId})" style="color:#ef4444; border:1px solid #ef4444; background:transparent; margin-left: auto;"><i class="ph ph-trash"></i> Excluir</button>\`;\n        actionsHtml += \`</div>\`;`
    );
}

// Ajustar botoes de exclusao nos casos onde nao tem div encapsulando ainda (antes do IF the "processo_iniciado")
if (content.includes('actionsHtml = `<button class="btn btn-sm" onclick="window.gerarDocumentoSinistro')) {
    const search = "actionsHtml = `<button class=\"btn btn-sm\" onclick=\"window.gerarDocumentoSinistro(${s.id}, ${colabId})\" style=\"color:#0284c7; background:#e0f2fe; border:none;\"><i class=\"ph ph-file-text\"></i> Gerar Documento</button>`;";
    const replace = "actionsHtml = `<div style=\"display:flex;gap:0.5rem;width:100%;justify-content:flex-end;\"><button class=\"btn btn-sm\" onclick=\"window.gerarDocumentoSinistro(${s.id}, ${colabId})\" style=\"color:#0284c7; background:#e0f2fe; border:none;\"><i class=\"ph ph-file-text\"></i> Gerar Documento</button> <button class=\"btn btn-sm btn-outline-danger\" onclick=\"window.excluirSinistro(${s.id}, ${colabId})\" style=\"color:#ef4444; border:1px solid #ef4444; background:transparent;\"><i class=\"ph ph-trash\"></i> Excluir</button></div>`;";
    content = content.replace(search, replace);
}

if (content.includes("actionsHtml = `<span style=\"font-size:0.85rem; color:#64748b;\"><i class=\"ph ph-check-circle\"></i> Apenas Registro (BO Anexado)</span>`;")) {
    const search = "actionsHtml = `<span style=\"font-size:0.85rem; color:#64748b;\"><i class=\"ph ph-check-circle\"></i> Apenas Registro (BO Anexado)</span>`;";
    const replace = "actionsHtml = `<div style=\"display:flex;gap:0.5rem;width:100%;justify-content:space-between;align-items:center;\"><span style=\"font-size:0.85rem; color:#64748b;\"><i class=\"ph ph-check-circle\"></i> Apenas Registro (BO Anexado)</span> <button class=\"btn btn-sm btn-outline-danger\" onclick=\"window.excluirSinistro(${s.id}, ${colabId})\" style=\"color:#ef4444; border:1px solid #ef4444; background:transparent;\"><i class=\"ph ph-trash\"></i> Excluir</button></div>`;";
    content = content.replace(search, replace);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Frontend patchado!');
