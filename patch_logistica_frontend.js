const fs = require('fs');
let js = fs.readFileSync('frontend/credenciamento.js', 'utf8');

// 1. Modificar _renderizarTabelaHistorico
const trMatch = `        return \\`
        <tr>
            <td>
                <b>\\\${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">\\\${cred.cliente_email}</span>
                \\\${cred.endereco_instalacao ? \\\`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \\\${cred.endereco_instalacao}</span>\\\` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${licencasText}</td>
            <td style="font-size:0.85rem;">\\\${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">
                <a href="/credenciamento-publico.html?token=\\\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                    <i class="ph ph-link"></i> Link
                </a>
                <button class="btn btn-outline" style="padding:4px 8px; font-size:12px; color:#dc2626; border-color:#fca5a5; background:#fff;" onclick="window.excluirCredenciamento('\\\${cred.id}')" title="Excluir">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        </tr>\\\`;`;

const trReplace = `
        let acoes = '';
        if (cred.status === 'solicitado') {
            acoes = \\\`<button class="btn btn-primary" style="padding:4px 12px; font-size:12px;" onclick="window.abrirModalCumprirSolicitacao('\\\${cred.id}')"><i class="ph ph-plus"></i> Adicionar</button>\\\`;
        } else {
            acoes = \\\`<a href="/credenciamento-publico.html?token=\\\${cred.token}" target="_blank" class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:4px;" title="Testar / Visualizar Link">
                <i class="ph ph-link"></i> Link
            </a>\\\`;
        }

        // Alterar badge se solicitado
        if (cred.status === 'solicitado') {
            const dtLim = cred.data_limite_envio ? new Date(cred.data_limite_envio).toLocaleDateString('pt-BR') : '-';
            statusBadge = \\\`<span style="color:#eab308; font-weight:600;"><i class="ph ph-clock"></i> Solicitado (Limite: \\\${dtLim})</span>\\\`;
        }

        return \\`
        <tr>
            <td>
                <b>\\\${cred.cliente_nome}</b><br>
                <span style="font-size:0.8rem; color:#64748b;">\\\${cred.cliente_email}</span>
                \\\${cred.endereco_instalacao ? \\\`<br><span style="font-size:0.75rem; color:#94a3b8;"><i class="ph ph-map-pin"></i> \\\${cred.endereco_instalacao}</span>\\\` : ''}
            </td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${colabsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${veicsText}</td>
            <td style="font-size:0.8rem; line-height:1.6;">\\\${licencasText}</td>
            <td style="font-size:0.85rem;">\\\${statusBadge}</td>
            <td style="text-align:right; white-space:nowrap;">\\\${acoes}</td>
        </tr>\\\`;`;

if (js.includes(trMatch)) {
    js = js.replace(trMatch, trReplace);
}

// 2. Adicionar função abrirModalCumprirSolicitacao e cumprirSolicitacaoCredenciamento
if (!js.includes('abrirModalCumprirSolicitacao')) {
    const fnCumprir = `
// ── Cumprir Solicitação do Comercial ──────────────────────────────────────────
window.abrirModalCumprirSolicitacao = function(id) {
    const cred = window._historicoCredDados.find(c => c.id == id);
    if (!cred) return;

    window.abrirModalNovoCredenciamento();
    
    // Configura os campos
    document.getElementById('cred-cliente-nome').value = cred.cliente_nome || '';
    document.getElementById('cred-cliente-nome').disabled = true;
    
    document.getElementById('cred-cliente-email').value = cred.cliente_email || '';
    document.getElementById('cred-cliente-email').disabled = true;
    
    document.getElementById('cred-endereco-instalacao').value = cred.endereco_instalacao || '';
    document.getElementById('cred-endereco-instalacao').disabled = true;
    
    // Docs
    const docs = cred.docs_exigidos ? JSON.parse(cred.docs_exigidos) : [];
    document.querySelectorAll('#cred-docs-exigidos input[type="checkbox"]').forEach(c => {
        c.checked = docs.includes(c.value);
        c.disabled = true;
    });

    // Licenças
    const lics = cred.licencas_ids ? JSON.parse(cred.licencas_ids) : [];
    credenciamentoState.licencas = lics;
    renderListaLicencasCred();
    document.getElementById('cred-licencas-list').style.pointerEvents = 'none';
    
    // Limpar Colabs e Veiculos caso tenha sujeira
    credenciamentoState.colabsSelecionados = [];
    credenciamentoState.veicsSelecionados = [];
    renderListaColabsCred();
    renderListaVeicCred();
    
    // Atualizar botão enviar para usar o ID
    const btn = document.getElementById('btn-enviar-cred');
    if (btn) {
        btn.setAttribute('onclick', \`window.cumprirSolicitacaoCredenciamento('\${id}')\`);
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Finalizar Credenciamento e Enviar';
    }
};

window.cumprirSolicitacaoCredenciamento = async function(id) {
    if (credenciamentoState.colabsSelecionados.length === 0) {
        alert("Selecione pelo menos um colaborador.");
        return;
    }

    const btn = document.getElementById('btn-enviar-cred');
    btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Gerando Link...';
    btn.disabled = true;

    try {
        const payload = {
            colaboradores: credenciamentoState.colabsSelecionados.map(c => ({id: c.id, nome: c.nome || c.nome_completo})),
            veiculos: credenciamentoState.veicsSelecionados.map(v => ({id: v.id, placa: v.placa, marca_modelo_versao: v.marca_modelo_versao}))
        };

        const token = window.currentToken || localStorage.getItem('erp_token') || localStorage.getItem('token');
        const res = await fetch(\`/api/logistica/credenciamento/\${id}/enviar\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao gerar credenciamento.');

        alert("Credenciamento finalizado e e-mail enviado ao cliente com sucesso!");
        window.fecharModalNovoCredenciamento();
        window.carregarHistoricoCredenciamento();
    } catch(e) {
        alert(e.message);
    } finally {
        btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Gerar e Enviar E-mail';
        btn.disabled = false;
    }
};

// Interceptar o fechamento para restaurar o estado normal do botão e disabled fields
const _oldFechar = window.fecharModalNovoCredenciamento;
window.fecharModalNovoCredenciamento = function() {
    _oldFechar();
    setTimeout(() => {
        document.getElementById('cred-cliente-nome').disabled = false;
        document.getElementById('cred-cliente-email').disabled = false;
        document.getElementById('cred-endereco-instalacao').disabled = false;
        document.querySelectorAll('#cred-docs-exigidos input[type="checkbox"]').forEach(c => c.disabled = false);
        document.getElementById('cred-licencas-list').style.pointerEvents = 'auto';
        
        const btn = document.getElementById('btn-enviar-cred');
        if (btn) {
            btn.setAttribute('onclick', 'window.gerarEnviarCredenciamento()');
            btn.innerHTML = '<i class="ph ph-paper-plane-right"></i> Gerar e Enviar E-mail';
        }
    }, 300);
}
`;
    js += fnCumprir; // oops, I need to use fnCumprir
}

fs.writeFileSync('frontend/credenciamento.js', js, 'utf8');
console.log('credenciamento.js patched');
