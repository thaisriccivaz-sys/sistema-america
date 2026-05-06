window.downloadDatabase = async function() {
    const token = window.currentToken || localStorage.getItem('erp_token');
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
        return;
    }

    try {
        const btn = document.querySelector('[onclick="window.downloadDatabase()"]');
        if (btn) { btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Baixando...'; btn.disabled = true; }

        const res = await fetch(`${window.location.origin}/api/maintenance/download-db`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const err = await res.json();
            alert('Erro: ' + (err.error || 'Falha no download'));
            return;
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hr_system_v2.sqlite';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (btn) { btn.innerHTML = '<i class="ph ph-download-simple"></i> Baixar Banco de Dados'; btn.disabled = false; }
    } catch(e) {
        alert('Erro no download: ' + e.message);
    }
};

window.uploadDatabase = async function() {
    const fileInput = document.getElementById('db-upload-file');
    const file = fileInput.files[0];
    if (!file) {
        return alert('Selecione um arquivo .sqlite primeiro!');
    }

    if (!confirm('ATENÇÃO: Isso vai SOBRESCREVER TODO O BANCO DE DADOS ATUAL deste servidor e reiniciá-lo. Você tem certeza absoluta?')) return;

    const formData = new FormData();
    formData.append('database', file);

    const btn = document.getElementById('btn-upload-db');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${window.location.origin}/api/maintenance/upload-db`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.currentToken || localStorage.getItem('erp_token')}`
            },
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            alert('Banco de dados substituído com sucesso! O servidor está reiniciando...');
            setTimeout(() => { window.location.reload(); }, 3000);
        } else {
            alert('Erro: ' + (data.error || 'Erro desconhecido'));
        }
    } catch(e) {
        alert('Erro na requisição: ' + e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-upload-simple"></i> Enviar';
        btn.disabled = false;
    }
};

// ─── ADMIN: Auditoria e correção de assinaturas falso-positivo ────────────────
// Disponível em PRODUÇÃO e HOMOLOGAÇÃO (mesma codebase — chama a API do ambiente ativo)

window._adminAuditColabsCarregados = false;

document.addEventListener('DOMContentLoaded', () => {
    // Carrega colaboradores quando o menu "Homologação" é clicado
    document.querySelectorAll('[data-target="homologacao"]').forEach(el => {
        el.addEventListener('click', () => window._adminCarregarColabsAudit());
    });
});

window._adminCarregarColabsAudit = async function() {
    if (window._adminAuditColabsCarregados) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    try {
        const res = await fetch(`${window.location.origin}/api/colaboradores`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const colabs = await res.json();
        const sel = document.getElementById('admin-audit-colab-select');
        if (!sel) return;
        sel.innerHTML = '<option value="">— Todos os colaboradores —</option>';
        (Array.isArray(colabs) ? colabs : [])
            .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo))
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nome_completo;
                sel.appendChild(opt);
            });
        window._adminAuditColabsCarregados = true;
    } catch(e) {
        console.error('[ADMIN-AUDIT] Erro ao carregar colaboradores:', e.message);
    }
};

window.adminAuditarAssinaturas = async function() {
    const token = window.currentToken || localStorage.getItem('erp_token');
    const colabId = document.getElementById('admin-audit-colab-select')?.value;
    const resultDiv = document.getElementById('admin-audit-result');
    const summaryDiv = document.getElementById('admin-audit-summary');
    const tbody = document.getElementById('admin-audit-tbody');
    const btnReset = document.getElementById('btn-admin-reset-todos');

    summaryDiv.textContent = 'Auditando...';
    summaryDiv.style.background = '#f1f5f9';
    summaryDiv.style.color = '#475569';
    resultDiv.style.display = 'block';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#64748b;"><i class="ph ph-spinner ph-spin"></i> Buscando...</td></tr>';

    try {
        const url = colabId
            ? `${window.location.origin}/api/admin/auditar-assinaturas?colaborador_id=${colabId}`
            : `${window.location.origin}/api/admin/auditar-assinaturas`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const registros = data.registros || [];

        if (registros.length === 0) {
            summaryDiv.textContent = '✅ Nenhum documento com falso positivo encontrado.';
            summaryDiv.style.background = '#dcfce7';
            summaryDiv.style.color = '#166534';
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1rem;color:#64748b;">Tudo certo!</td></tr>';
            if (btnReset) btnReset.disabled = true;
            return;
        }

        summaryDiv.innerHTML = `⚠️ ${registros.length} documento(s) com falso positivo encontrado(s). Esses documentos aparecem como "Assinado" mas não têm PDF assinado.`;
        summaryDiv.style.background = '#fef3c7';
        summaryDiv.style.color = '#92400e';
        if (btnReset) btnReset.disabled = !colabId;

        tbody.innerHTML = registros.map(r => `
            <tr>
                <td style="font-weight:600;">${r.nome_completo}</td>
                <td>${r.nome_documento}</td>
                <td><span style="font-size:0.75rem;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${r.tabela}</span></td>
                <td style="font-family:monospace;font-size:0.75rem;">${r.assinafy_id || '—'}</td>
                <td style="font-size:0.8rem;">${r.data_status ? new Date(r.data_status).toLocaleString('pt-BR') : '—'}</td>
                <td>
                    <button class="btn btn-sm" onclick="window.adminResetarUmDoc(${r.id}, '${r.tabela}', this)"
                        style="background:#d9480f;color:#fff;font-size:0.78rem;padding:4px 10px;border:none;border-radius:6px;cursor:pointer;">
                        <i class="ph ph-arrow-counter-clockwise"></i> Reverter
                    </button>
                </td>
            </tr>
        `).join('');
    } catch(e) {
        summaryDiv.textContent = '❌ Erro: ' + e.message;
        summaryDiv.style.background = '#fee2e2';
        summaryDiv.style.color = '#991b1b';
    }
};

window.adminResetarUmDoc = async function(docId, tabela, btn) {
    if (!confirm('Reverter este documento para "Aguardando"?\n\nIsso permitirá reenviá-lo para assinatura.')) return;
    const token = window.currentToken || localStorage.getItem('erp_token');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${window.location.origin}/api/admin/resetar-assinatura-falsa`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ doc_id: docId, tabela })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            btn.closest('tr').style.background = '#dcfce7';
            btn.innerHTML = '✅ Revertido';
            if (typeof showToast !== 'undefined') showToast('Documento revertido para "Aguardando". Já pode reenviar no prontuário.', 'success');
        } else {
            btn.innerHTML = orig;
            btn.disabled = false;
            alert('Erro: ' + (data.error || 'Falha'));
        }
    } catch(e) {
        btn.innerHTML = orig;
        btn.disabled = false;
        alert('Erro: ' + e.message);
    }
};

window.adminResetarTodosColab = async function() {
    const sel = document.getElementById('admin-audit-colab-select');
    const colabId = sel?.value;
    const colabNome = sel?.selectedOptions[0]?.text;
    if (!colabId) return alert('Selecione um colaborador primeiro.');
    if (!confirm(`Reverter TODOS os documentos falso-positivo de:\n\n"${colabNome}"\n\nEles voltarão para "Aguardando" e poderão ser reenviados para assinatura.`)) return;

    const token = window.currentToken || localStorage.getItem('erp_token');
    const btn = document.getElementById('btn-admin-reset-todos');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Revertendo...';
    btn.disabled = true;

    try {
        const res = await fetch(`${window.location.origin}/api/admin/resetar-assinatura-falsa`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ colaborador_id: colabId })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
            if (typeof showToast !== 'undefined') showToast(`${data.total} documento(s) revertido(s) para "Aguardando"!`, 'success');
            await window.adminAuditarAssinaturas(); // Atualiza a tabela
        } else {
            alert('Erro: ' + (data.error || 'Falha'));
        }
    } catch(e) {
        alert('Erro: ' + e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-arrow-counter-clockwise"></i> Reverter Todos do Colaborador';
        btn.disabled = false;
    }
};
